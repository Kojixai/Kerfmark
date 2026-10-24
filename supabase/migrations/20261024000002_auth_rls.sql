-- =============================================================================
-- Brackenbury OS :: 002 auth + RLS
-- Roles and permissions, custom access token hook, authorize(), visibility
-- helpers, row level security on every public table, client/portal functions.
--
-- Conventions
--   * Every policy targets `authenticated` (or supabase_auth_admin for the hook).
--     anon has no table privileges at all; the portal works only through
--     security definer functions.
--   * Constant checks are wrapped as (select public.authorize('x')) so Postgres
--     evaluates them once per statement, not once per row.
--   * Row-dependent checks call private.* security definer helpers, which read
--     link tables without recursing into their RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------
create table public.permissions (
  key          text primary key,
  description  text not null
);

create table public.role_permissions (
  role        public.app_role not null,
  permission  text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

-- Kept in the migration (not seed.sql) because `supabase db push` never runs
-- seed.sql: without these rows production would deny everything.
insert into public.permissions (key, description) values
  ('projects.read_all',      'See every project, including NDA names and clients'),
  ('projects.read_workshop', 'See all projects through workshop views (NDA projects show codename only)'),
  ('projects.write',         'Create and edit projects, assignments, events and documents'),
  ('projects.delete',        'Delete projects'),
  ('clients.read',           'See clients and contacts'),
  ('clients.write',          'Edit clients and contacts'),
  ('subcontractors.read',    'See subcontractors'),
  ('subcontractors.write',   'Edit subcontractors'),
  ('staff.read',             'See all staff profiles, certificates and training'),
  ('people.write',           'Edit staff, certificates, training, health surveillance'),
  ('health.read',            'See health surveillance records for all staff'),
  ('training.read',          'See machine sign-offs for all staff'),
  ('pay.read',               'See salaries, pay history and payslips'),
  ('pay.write',              'Record pay and rises'),
  ('prices.read',            'See price book, labour rates, estimates, costs and margins'),
  ('prices.write',           'Edit price book and labour rates'),
  ('estimates.write',        'Edit estimates, parts, costs, operations, subcontract quotes'),
  ('cutting.read',           'See cutting lists, parts and sheet layouts (no prices)'),
  ('quotes.read',            'See client quotes and approvals'),
  ('quotes.write',           'Create and edit client quotes and portal links'),
  ('quotes.approve',         'Sign an approval (clients: own projects only)'),
  ('documents.write',        'Upload documents to visible projects'),
  ('events.write',           'Add timeline notes to visible projects'),
  ('xero.read',              'See Xero invoices, bills and bank mirrors'),
  ('emails.read',            'See filed emails, templates and chase rules'),
  ('emails.send',            'Send emails and edit templates and chase rules'),
  ('compliance.read',        'See compliance checks and log'),
  ('compliance.write',       'Edit compliance checks and record checks'),
  ('sops.read',              'Read published procedures'),
  ('sops.write',             'Write procedures'),
  ('audit.read',             'Read the audit log'),
  ('users.read',             'See all user profiles and role permissions'),
  ('users.manage',           'Create users and change roles'),
  ('settings.write',         'Edit company settings'),
  ('subcontract.respond',    'Subcontractor: submit prices for own requests');

insert into public.role_permissions (role, permission)
select 'director'::public.app_role, key from public.permissions
 where key not in ('projects.read_workshop', 'subcontract.respond');

insert into public.role_permissions (role, permission) values
  ('office', 'projects.read_all'), ('office', 'projects.write'),
  ('office', 'clients.read'), ('office', 'clients.write'),
  ('office', 'subcontractors.read'), ('office', 'subcontractors.write'),
  ('office', 'staff.read'), ('office', 'people.write'), ('office', 'health.read'), ('office', 'training.read'),
  ('office', 'prices.read'), ('office', 'prices.write'), ('office', 'estimates.write'), ('office', 'cutting.read'),
  ('office', 'quotes.read'), ('office', 'quotes.write'),
  ('office', 'documents.write'), ('office', 'events.write'),
  ('office', 'xero.read'), ('office', 'emails.read'), ('office', 'emails.send'),
  ('office', 'compliance.read'), ('office', 'compliance.write'),
  ('office', 'sops.read'), ('office', 'sops.write'), ('office', 'users.read'),

  ('workshop', 'projects.read_workshop'), ('workshop', 'cutting.read'), ('workshop', 'training.read'),
  ('workshop', 'compliance.read'), ('workshop', 'sops.read'),

  ('fitter', 'cutting.read'), ('fitter', 'events.write'), ('fitter', 'documents.write'), ('fitter', 'sops.read'),

  ('subcontractor', 'subcontract.respond'),

  ('client', 'quotes.approve');

-- -----------------------------------------------------------------------------
-- authorize(): never throws. Missing / unknown claim => false.
-- -----------------------------------------------------------------------------
create or replace function public.authorize(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.role_permissions rp
     where rp.role::text = (auth.jwt() ->> 'user_role')
       and rp.permission = p
  );
$$;

-- -----------------------------------------------------------------------------
-- Custom access token hook: adds user_role, staff_id, client_id,
-- subcontractor_id claims. Runs as supabase_auth_admin (not security definer).
-- -----------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims  jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_profile record;
begin
  select p.role, p.staff_id, p.client_id, p.subcontractor_id
    into v_profile
    from public.profiles p
   where p.id = (event ->> 'user_id')::uuid
     and p.active;

  if found then
    v_claims := v_claims
      || jsonb_build_object(
           'user_role',        v_profile.role::text,
           'staff_id',         v_profile.staff_id,
           'client_id',        v_profile.client_id,
           'subcontractor_id', v_profile.subcontractor_id);
  else
    -- No (active) profile: explicit nulls so nothing stale survives a refresh.
    v_claims := v_claims
      || jsonb_build_object('user_role', null, 'staff_id', null,
                            'client_id', null, 'subcontractor_id', null);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Private helpers (schema not exposed by PostgREST)
-- -----------------------------------------------------------------------------
grant usage on schema private to authenticated, service_role;

create or replace function private.jwt_role()
returns text
language sql
stable
set search_path = ''
as $$
  select auth.jwt() ->> 'user_role';
$$;

-- Claim as uuid; null when missing or malformed (never throws).
create or replace function private.jwt_uuid(k text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
           when (auth.jwt() ->> k) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (auth.jwt() ->> k)::uuid
         end;
$$;

-- Can the caller see this project's own row (and its client-facing data)?
--   director/office: all; fitter: via project_assignments;
--   subcontractor: via subcontract_assignments; client: own client_id.
create or replace function private.can_see_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_project is null then false
    when public.authorize('projects.read_all') then true
    when private.jwt_role() = 'fitter' then exists (
      select 1 from public.project_assignments pa
       where pa.project_id = p_project
         and pa.staff_id = private.jwt_uuid('staff_id'))
    when private.jwt_role() = 'subcontractor' then exists (
      select 1 from public.subcontract_assignments sa
       where sa.project_id = p_project
         and sa.subcontractor_id = private.jwt_uuid('subcontractor_id')
         and sa.status in ('invited', 'active', 'complete'))
    when private.jwt_role() = 'client' then exists (
      select 1 from public.projects p
       where p.id = p_project
         and p.client_id = private.jwt_uuid('client_id'))
    else false
  end;
$$;

-- Workshop-level visibility: as above plus projects.read_workshop.
create or replace function private.can_see_project_ops(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.authorize('projects.read_workshop') or private.can_see_project(p_project);
$$;

-- Audience-tagged rows (documents, project_events).
create or replace function private.can_see_item(p_project uuid, p_audience public.audience)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_audience
    when 'office' then public.authorize('projects.read_all')
    when 'team' then
      coalesce(private.jwt_role(), 'client') <> 'client'
      and case when p_project is null
               then private.jwt_role() in ('director', 'office', 'workshop', 'fitter')
               else private.can_see_project_ops(p_project) end
    when 'client' then
      case when p_project is null
           then private.jwt_role() is not null
           else private.can_see_project_ops(p_project) end
    else false
  end;
$$;

create or replace function private.estimate_project(p_estimate uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.project_id from public.estimates e where e.id = p_estimate;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.jwt_role(), private.jwt_uuid(text),
  private.can_see_project(uuid), private.can_see_project_ops(uuid),
  private.can_see_item(uuid, public.audience), private.estimate_project(uuid)
  to authenticated, service_role;

revoke execute on function public.authorize(text) from public, anon;
grant execute on function public.authorize(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Table privileges. RLS decides rows; these remove whole capabilities.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;  -- TRUNCATE bypasses RLS
revoke insert, update, delete on
  public.invoices_mirror, public.bills_mirror, public.bank_transactions_mirror,
  public.payslips_mirror, public.audit_log, public.permissions, public.role_permissions
  from authenticated;

-- =============================================================================
-- Enable RLS on everything in public
-- =============================================================================
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end;
$$;

-- =============================================================================
-- Policies
-- =============================================================================

-- permissions / role_permissions -------------------------------------------
create policy permissions_select on public.permissions
  for select to authenticated using (true);

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (role::text = (select private.jwt_role()) or (select public.authorize('users.read')));

-- companies ------------------------------------------------------------------
create policy companies_select on public.companies
  for select to authenticated using ((select private.jwt_role()) is not null);
create policy companies_insert on public.companies
  for insert to authenticated with check ((select public.authorize('settings.write')));
create policy companies_update on public.companies
  for update to authenticated using ((select public.authorize('settings.write')))
  with check ((select public.authorize('settings.write')));
create policy companies_delete on public.companies
  for delete to authenticated using ((select public.authorize('settings.write')));

-- profiles -------------------------------------------------------------------
create policy profiles_auth_admin_select on public.profiles
  as permissive for select to supabase_auth_admin using (true);
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.authorize('users.read')));
-- No self-update: role / links can only be changed by users.manage.
create policy profiles_insert on public.profiles
  for insert to authenticated with check ((select public.authorize('users.manage')));
create policy profiles_update on public.profiles
  for update to authenticated using ((select public.authorize('users.manage')))
  with check ((select public.authorize('users.manage')));
create policy profiles_delete on public.profiles
  for delete to authenticated using ((select public.authorize('users.manage')));

-- staff ----------------------------------------------------------------------
create policy staff_select on public.staff
  for select to authenticated
  using ((select public.authorize('staff.read')) or id = (select private.jwt_uuid('staff_id')));
create policy staff_insert on public.staff
  for insert to authenticated with check ((select public.authorize('people.write')));
create policy staff_update on public.staff
  for update to authenticated using ((select public.authorize('people.write')))
  with check ((select public.authorize('people.write')));
create policy staff_delete on public.staff
  for delete to authenticated using ((select public.authorize('people.write')));

-- staff_pay: director only (pay.read / pay.write). Not even own row.
create policy staff_pay_select on public.staff_pay
  for select to authenticated using ((select public.authorize('pay.read')));
create policy staff_pay_insert on public.staff_pay
  for insert to authenticated with check ((select public.authorize('pay.write')));
create policy staff_pay_update on public.staff_pay
  for update to authenticated using ((select public.authorize('pay.write')))
  with check ((select public.authorize('pay.write')));
create policy staff_pay_delete on public.staff_pay
  for delete to authenticated using ((select public.authorize('pay.write')));

-- staff_certificates ---------------------------------------------------------
create policy staff_certificates_select on public.staff_certificates
  for select to authenticated
  using ((select public.authorize('staff.read')) or staff_id = (select private.jwt_uuid('staff_id')));
create policy staff_certificates_insert on public.staff_certificates
  for insert to authenticated with check ((select public.authorize('people.write')));
create policy staff_certificates_update on public.staff_certificates
  for update to authenticated using ((select public.authorize('people.write')))
  with check ((select public.authorize('people.write')));
create policy staff_certificates_delete on public.staff_certificates
  for delete to authenticated using ((select public.authorize('people.write')));

-- staff_training (machine sign-offs) ----------------------------------------
create policy staff_training_select on public.staff_training
  for select to authenticated
  using ((select public.authorize('staff.read')) or (select public.authorize('training.read'))
         or staff_id = (select private.jwt_uuid('staff_id')));
create policy staff_training_insert on public.staff_training
  for insert to authenticated with check ((select public.authorize('people.write')));
create policy staff_training_update on public.staff_training
  for update to authenticated using ((select public.authorize('people.write')))
  with check ((select public.authorize('people.write')));
create policy staff_training_delete on public.staff_training
  for delete to authenticated using ((select public.authorize('people.write')));

-- health_surveillance --------------------------------------------------------
create policy health_surveillance_select on public.health_surveillance
  for select to authenticated
  using ((select public.authorize('health.read')) or staff_id = (select private.jwt_uuid('staff_id')));
create policy health_surveillance_insert on public.health_surveillance
  for insert to authenticated
  with check ((select public.authorize('people.write')) and (select public.authorize('health.read')));
create policy health_surveillance_update on public.health_surveillance
  for update to authenticated
  using ((select public.authorize('people.write')) and (select public.authorize('health.read')))
  with check ((select public.authorize('people.write')) and (select public.authorize('health.read')));
create policy health_surveillance_delete on public.health_surveillance
  for delete to authenticated
  using ((select public.authorize('people.write')) and (select public.authorize('health.read')));

-- clients / contacts ---------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated
  using ((select public.authorize('clients.read'))
         or ((select private.jwt_role()) = 'client' and id = (select private.jwt_uuid('client_id'))));
create policy clients_insert on public.clients
  for insert to authenticated with check ((select public.authorize('clients.write')));
create policy clients_update on public.clients
  for update to authenticated using ((select public.authorize('clients.write')))
  with check ((select public.authorize('clients.write')));
create policy clients_delete on public.clients
  for delete to authenticated using ((select public.authorize('clients.write')));

create policy contacts_select on public.contacts
  for select to authenticated
  using ((select public.authorize('clients.read'))
         or ((select private.jwt_role()) = 'client' and client_id = (select private.jwt_uuid('client_id'))));
create policy contacts_insert on public.contacts
  for insert to authenticated with check ((select public.authorize('clients.write')));
create policy contacts_update on public.contacts
  for update to authenticated using ((select public.authorize('clients.write')))
  with check ((select public.authorize('clients.write')));
create policy contacts_delete on public.contacts
  for delete to authenticated using ((select public.authorize('clients.write')));

-- subcontractors -------------------------------------------------------------
create policy subcontractors_select on public.subcontractors
  for select to authenticated
  using ((select public.authorize('subcontractors.read'))
         or ((select private.jwt_role()) = 'subcontractor'
             and id = (select private.jwt_uuid('subcontractor_id'))));
create policy subcontractors_insert on public.subcontractors
  for insert to authenticated with check ((select public.authorize('subcontractors.write')));
create policy subcontractors_update on public.subcontractors
  for update to authenticated using ((select public.authorize('subcontractors.write')))
  with check ((select public.authorize('subcontractors.write')));
create policy subcontractors_delete on public.subcontractors
  for delete to authenticated using ((select public.authorize('subcontractors.write')));

-- projects -------------------------------------------------------------------
-- Workshop has NO direct row access (NDA names); it uses public.workshop_projects.
create policy projects_select on public.projects
  for select to authenticated
  using ((select public.authorize('projects.read_all')) or private.can_see_project(id));
create policy projects_insert on public.projects
  for insert to authenticated with check ((select public.authorize('projects.write')));
create policy projects_update on public.projects
  for update to authenticated using ((select public.authorize('projects.write')))
  with check ((select public.authorize('projects.write')));
create policy projects_delete on public.projects
  for delete to authenticated using ((select public.authorize('projects.delete')));

-- project_assignments / subcontract_assignments ------------------------------
create policy project_assignments_select on public.project_assignments
  for select to authenticated
  using ((select public.authorize('projects.read_all')) or staff_id = (select private.jwt_uuid('staff_id')));
create policy project_assignments_insert on public.project_assignments
  for insert to authenticated with check ((select public.authorize('projects.write')));
create policy project_assignments_update on public.project_assignments
  for update to authenticated using ((select public.authorize('projects.write')))
  with check ((select public.authorize('projects.write')));
create policy project_assignments_delete on public.project_assignments
  for delete to authenticated using ((select public.authorize('projects.write')));

create policy subcontract_assignments_select on public.subcontract_assignments
  for select to authenticated
  using ((select public.authorize('projects.read_all'))
         or ((select private.jwt_role()) = 'subcontractor'
             and subcontractor_id = (select private.jwt_uuid('subcontractor_id'))));
create policy subcontract_assignments_insert on public.subcontract_assignments
  for insert to authenticated with check ((select public.authorize('projects.write')));
create policy subcontract_assignments_update on public.subcontract_assignments
  for update to authenticated using ((select public.authorize('projects.write')))
  with check ((select public.authorize('projects.write')));
create policy subcontract_assignments_delete on public.subcontract_assignments
  for delete to authenticated using ((select public.authorize('projects.write')));

-- project_events -------------------------------------------------------------
create policy project_events_select on public.project_events
  for select to authenticated using (private.can_see_item(project_id, visibility));
create policy project_events_insert on public.project_events
  for insert to authenticated
  with check ((select public.authorize('events.write'))
              and private.can_see_project(project_id)
              and (actor_id is null or actor_id = (select auth.uid())));
create policy project_events_update on public.project_events
  for update to authenticated using ((select public.authorize('projects.write')))
  with check ((select public.authorize('projects.write')));
create policy project_events_delete on public.project_events
  for delete to authenticated using ((select public.authorize('projects.write')));

-- documents ------------------------------------------------------------------
create policy documents_select on public.documents
  for select to authenticated using (private.can_see_item(project_id, visibility));
create policy documents_insert on public.documents
  for insert to authenticated
  with check ((select public.authorize('documents.write'))
              and ((project_id is null and (select public.authorize('projects.write')))
                   or private.can_see_project(project_id)));
create policy documents_update on public.documents
  for update to authenticated using ((select public.authorize('projects.write')))
  with check ((select public.authorize('projects.write')));
create policy documents_delete on public.documents
  for delete to authenticated using ((select public.authorize('projects.write')));

-- price book (prices.read / prices.write) ------------------------------------
create policy price_items_select on public.price_items
  for select to authenticated using ((select public.authorize('prices.read')));
create policy price_items_insert on public.price_items
  for insert to authenticated with check ((select public.authorize('prices.write')));
create policy price_items_update on public.price_items
  for update to authenticated using ((select public.authorize('prices.write')))
  with check ((select public.authorize('prices.write')));
create policy price_items_delete on public.price_items
  for delete to authenticated using ((select public.authorize('prices.write')));

-- History is append-only.
create policy price_history_select on public.price_history
  for select to authenticated using ((select public.authorize('prices.read')));
create policy price_history_insert on public.price_history
  for insert to authenticated with check ((select public.authorize('prices.write')));

create policy labour_rates_select on public.labour_rates
  for select to authenticated using ((select public.authorize('prices.read')));
create policy labour_rates_insert on public.labour_rates
  for insert to authenticated with check ((select public.authorize('prices.write')));
create policy labour_rates_update on public.labour_rates
  for update to authenticated using ((select public.authorize('prices.write')))
  with check ((select public.authorize('prices.write')));
create policy labour_rates_delete on public.labour_rates
  for delete to authenticated using ((select public.authorize('prices.write')));

-- estimating internals (prices.read / estimates.write) ----------------------
create policy estimates_select on public.estimates
  for select to authenticated using ((select public.authorize('prices.read')));
create policy estimates_insert on public.estimates
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy estimates_update on public.estimates
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy estimates_delete on public.estimates
  for delete to authenticated using ((select public.authorize('estimates.write')));

-- Items carry names/qty only (no money): cutting.read may see them for visible projects.
create policy estimate_items_select on public.estimate_items
  for select to authenticated
  using ((select public.authorize('prices.read'))
         or ((select public.authorize('cutting.read'))
             and private.can_see_project_ops(private.estimate_project(estimate_id))));
create policy estimate_items_insert on public.estimate_items
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy estimate_items_update on public.estimate_items
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy estimate_items_delete on public.estimate_items
  for delete to authenticated using ((select public.authorize('estimates.write')));

-- parts: no cost columns, so cutting.read may read them for visible projects.
create policy parts_select on public.parts
  for select to authenticated
  using ((select public.authorize('prices.read'))
         or ((select public.authorize('cutting.read')) and private.can_see_project_ops(project_id)));
create policy parts_insert on public.parts
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy parts_update on public.parts
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy parts_delete on public.parts
  for delete to authenticated using ((select public.authorize('estimates.write')));

create policy part_costs_select on public.part_costs
  for select to authenticated using ((select public.authorize('prices.read')));
create policy part_costs_insert on public.part_costs
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy part_costs_update on public.part_costs
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy part_costs_delete on public.part_costs
  for delete to authenticated using ((select public.authorize('estimates.write')));

create policy estimate_extras_select on public.estimate_extras
  for select to authenticated using ((select public.authorize('prices.read')));
create policy estimate_extras_insert on public.estimate_extras
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy estimate_extras_update on public.estimate_extras
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy estimate_extras_delete on public.estimate_extras
  for delete to authenticated using ((select public.authorize('estimates.write')));

create policy estimate_operations_select on public.estimate_operations
  for select to authenticated using ((select public.authorize('prices.read')));
create policy estimate_operations_insert on public.estimate_operations
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy estimate_operations_update on public.estimate_operations
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy estimate_operations_delete on public.estimate_operations
  for delete to authenticated using ((select public.authorize('estimates.write')));

-- Subcontractors can read their own requests; they respond via
-- public.subcontractor_submit_price() (no direct update).
create policy subcontract_quotes_select on public.subcontract_quotes
  for select to authenticated
  using ((select public.authorize('prices.read'))
         or ((select private.jwt_role()) = 'subcontractor'
             and subcontractor_id = (select private.jwt_uuid('subcontractor_id'))));
create policy subcontract_quotes_insert on public.subcontract_quotes
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy subcontract_quotes_update on public.subcontract_quotes
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy subcontract_quotes_delete on public.subcontract_quotes
  for delete to authenticated using ((select public.authorize('estimates.write')));

create policy sheet_layouts_select on public.sheet_layouts
  for select to authenticated
  using ((select public.authorize('prices.read'))
         or ((select public.authorize('cutting.read')) and private.can_see_project_ops(project_id)));
create policy sheet_layouts_insert on public.sheet_layouts
  for insert to authenticated with check ((select public.authorize('estimates.write')));
create policy sheet_layouts_update on public.sheet_layouts
  for update to authenticated using ((select public.authorize('estimates.write')))
  with check ((select public.authorize('estimates.write')));
create policy sheet_layouts_delete on public.sheet_layouts
  for delete to authenticated using ((select public.authorize('estimates.write')));

-- quotes / quote_lines (clients use client_quote()/portal_open() instead) ---
create policy quotes_select on public.quotes
  for select to authenticated using ((select public.authorize('quotes.read')));
create policy quotes_insert on public.quotes
  for insert to authenticated with check ((select public.authorize('quotes.write')));
create policy quotes_update on public.quotes
  for update to authenticated using ((select public.authorize('quotes.write')))
  with check ((select public.authorize('quotes.write')));
create policy quotes_delete on public.quotes
  for delete to authenticated using ((select public.authorize('quotes.write')));

create policy quote_lines_select on public.quote_lines
  for select to authenticated using ((select public.authorize('quotes.read')));
create policy quote_lines_insert on public.quote_lines
  for insert to authenticated with check ((select public.authorize('quotes.write')));
create policy quote_lines_update on public.quote_lines
  for update to authenticated using ((select public.authorize('quotes.write')))
  with check ((select public.authorize('quotes.write')));
create policy quote_lines_delete on public.quote_lines
  for delete to authenticated using ((select public.authorize('quotes.write')));

-- approvals: append-only evidence. Clients sign via client_approve()/portal_approve().
create policy approvals_select on public.approvals
  for select to authenticated
  using ((select public.authorize('quotes.read'))
         or ((select private.jwt_role()) = 'client' and private.can_see_project(project_id)));
create policy approvals_insert on public.approvals
  for insert to authenticated
  with check ((select public.authorize('quotes.approve'))
              and (select private.jwt_role()) <> 'client'
              and signed_by = (select auth.uid())
              and private.can_see_project(project_id));

-- portal_links: created only by create_portal_link(); staff may revoke/delete.
create policy portal_links_select on public.portal_links
  for select to authenticated using ((select public.authorize('quotes.write')));
create policy portal_links_update on public.portal_links
  for update to authenticated using ((select public.authorize('quotes.write')))
  with check ((select public.authorize('quotes.write')));
create policy portal_links_delete on public.portal_links
  for delete to authenticated using ((select public.authorize('quotes.write')));

-- Xero mirrors: read-only for authenticated; written by service_role sync.
create policy invoices_mirror_select on public.invoices_mirror
  for select to authenticated using ((select public.authorize('xero.read')));
create policy bills_mirror_select on public.bills_mirror
  for select to authenticated using ((select public.authorize('xero.read')));
create policy bank_transactions_mirror_select on public.bank_transactions_mirror
  for select to authenticated using ((select public.authorize('xero.read')));
-- Payroll mirror is pay data: pay.read, NOT xero.read.
create policy payslips_mirror_select on public.payslips_mirror
  for select to authenticated using ((select public.authorize('pay.read')));

-- email ----------------------------------------------------------------------
create policy email_templates_select on public.email_templates
  for select to authenticated using ((select public.authorize('emails.read')));
create policy email_templates_insert on public.email_templates
  for insert to authenticated with check ((select public.authorize('emails.send')));
create policy email_templates_update on public.email_templates
  for update to authenticated using ((select public.authorize('emails.send')))
  with check ((select public.authorize('emails.send')));
create policy email_templates_delete on public.email_templates
  for delete to authenticated using ((select public.authorize('emails.send')));

create policy chase_rules_select on public.chase_rules
  for select to authenticated using ((select public.authorize('emails.read')));
create policy chase_rules_insert on public.chase_rules
  for insert to authenticated with check ((select public.authorize('emails.send')));
create policy chase_rules_update on public.chase_rules
  for update to authenticated using ((select public.authorize('emails.send')))
  with check ((select public.authorize('emails.send')));
create policy chase_rules_delete on public.chase_rules
  for delete to authenticated using ((select public.authorize('emails.send')));

create policy emails_select on public.emails
  for select to authenticated using ((select public.authorize('emails.read')));
create policy emails_insert on public.emails
  for insert to authenticated with check ((select public.authorize('emails.send')));
create policy emails_update on public.emails
  for update to authenticated using ((select public.authorize('emails.send')))
  with check ((select public.authorize('emails.send')));
create policy emails_delete on public.emails
  for delete to authenticated using ((select public.authorize('emails.send')));

-- compliance -----------------------------------------------------------------
create policy compliance_checks_select on public.compliance_checks
  for select to authenticated using ((select public.authorize('compliance.read')));
create policy compliance_checks_insert on public.compliance_checks
  for insert to authenticated with check ((select public.authorize('compliance.write')));
create policy compliance_checks_update on public.compliance_checks
  for update to authenticated using ((select public.authorize('compliance.write')))
  with check ((select public.authorize('compliance.write')));
create policy compliance_checks_delete on public.compliance_checks
  for delete to authenticated using ((select public.authorize('compliance.write')));

create policy compliance_log_select on public.compliance_log
  for select to authenticated using ((select public.authorize('compliance.read')));
create policy compliance_log_insert on public.compliance_log
  for insert to authenticated with check ((select public.authorize('compliance.write')));
create policy compliance_log_update on public.compliance_log
  for update to authenticated using ((select public.authorize('compliance.write')))
  with check ((select public.authorize('compliance.write')));
create policy compliance_log_delete on public.compliance_log
  for delete to authenticated using ((select public.authorize('compliance.write')));

-- SOPs -----------------------------------------------------------------------
create policy sops_select on public.sops
  for select to authenticated
  using ((select public.authorize('sops.write'))
         or (published and (select public.authorize('sops.read'))));
create policy sops_insert on public.sops
  for insert to authenticated with check ((select public.authorize('sops.write')));
create policy sops_update on public.sops
  for update to authenticated using ((select public.authorize('sops.write')))
  with check ((select public.authorize('sops.write')));
create policy sops_delete on public.sops
  for delete to authenticated using ((select public.authorize('sops.write')));

create policy sop_steps_select on public.sop_steps
  for select to authenticated
  using ((select public.authorize('sops.write'))
         or ((select public.authorize('sops.read'))
             and exists (select 1 from public.sops s where s.id = sop_id and s.published)));
create policy sop_steps_insert on public.sop_steps
  for insert to authenticated with check ((select public.authorize('sops.write')));
create policy sop_steps_update on public.sop_steps
  for update to authenticated using ((select public.authorize('sops.write')))
  with check ((select public.authorize('sops.write')));
create policy sop_steps_delete on public.sop_steps
  for delete to authenticated using ((select public.authorize('sops.write')));

-- audit_log: read-only, director. Written by private.audit_row().
create policy audit_log_select on public.audit_log
  for select to authenticated using ((select public.authorize('audit.read')));

-- =============================================================================
-- Workshop views
-- =============================================================================

-- Owner-rights view (not security_invoker): workshop has no row access to
-- projects, so this view is the only way it sees them. NDA projects show the
-- codename; client and site details are never exposed here.
create view public.workshop_projects
with (security_barrier = true)
as
select p.id,
       p.company_id,
       p.ref,
       case when p.nda then p.codename else p.name end as display_name,
       p.nda,
       p.sector,
       p.stage,
       p.contract_type,
       p.target_delivery
  from public.projects p
 where private.can_see_project_ops(p.id);

-- Cutting list without any cost columns. security_invoker, so parts RLS applies.
create view public.parts_workshop
with (security_invoker = true)
as
select pt.id,
       pt.project_id,
       wp.ref          as project_ref,
       wp.display_name as project_name,
       pt.estimate_item_id,
       ei.name         as item_name,
       pt.name,
       pt.material,
       pt.length_mm,
       pt.width_mm,
       pt.thickness_mm,
       pt.qty,
       pt.grain,
       pt.edging_m,
       pt.confidence,
       pt.checked,
       pt.pos_x, pt.pos_y, pt.pos_z,
       pt.dir
  from public.parts pt
  join public.workshop_projects wp on wp.id = pt.project_id
  left join public.estimate_items ei on ei.id = pt.estimate_item_id;

revoke all on public.workshop_projects, public.parts_workshop from anon, public;
grant select on public.workshop_projects, public.parts_workshop to authenticated;

-- =============================================================================
-- Client-facing quote functions
-- =============================================================================

-- Client-safe payload: totals, line descriptions/prices, payment schedule,
-- client-visible documents, approvals. Never estimates, prices, margin, labour.
create or replace function private.quote_payload(p_quote uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'company', jsonb_build_object('name', c.name, 'logo_path', c.logo_path, 'brand_colour', c.brand_colour),
    'project', jsonb_build_object('id', p.id, 'ref', p.ref, 'name', p.name, 'sector', p.sector, 'stage', p.stage),
    'quote', jsonb_build_object(
      'id', q.id, 'number', q.number, 'revision', q.revision, 'status', q.status,
      'currency', q.currency, 'subtotal', q.subtotal, 'vat_rate', q.vat_rate,
      'vat_amount', q.vat_amount, 'total', q.total, 'payment_schedule', q.payment_schedule,
      'client_message', q.client_message, 'valid_until', q.valid_until,
      'sent_at', q.sent_at, 'approved_at', q.approved_at),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'position', l.position, 'description', l.description, 'qty', l.qty,
               'unit_price', l.unit_price, 'line_total', l.line_total) order by l.position)
        from public.quote_lines l where l.quote_id = q.id), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'kind', d.kind, 'title', d.title, 'revision', d.revision,
               'storage_path', d.storage_path) order by d.created_at)
        from public.documents d
       where d.project_id = p.id and d.visibility = 'client'), '[]'::jsonb),
    'approvals', coalesce((
      select jsonb_agg(jsonb_build_object('kind', a.kind, 'signed_name', a.signed_name,
                                          'signed_at', a.signed_at) order by a.signed_at)
        from public.approvals a where a.project_id = p.id), '[]'::jsonb))
  from public.quotes q
  join public.projects p on p.id = q.project_id
  join public.companies c on c.id = p.company_id
 where q.id = p_quote;
$$;

-- Logged-in client: list own (non-draft) quotes.
create or replace function public.client_quotes()
returns table (
  id uuid, project_id uuid, project_ref text, project_name text, number text,
  revision integer, status public.quote_status, currency char(3), total numeric,
  valid_until date, sent_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, p.id, p.ref, p.name, q.number, q.revision, q.status, q.currency,
         q.total, q.valid_until, q.sent_at
    from public.quotes q
    join public.projects p on p.id = q.project_id
   where private.jwt_role() = 'client'
     and p.client_id = private.jwt_uuid('client_id')
     and q.status not in ('draft', 'superseded')
   order by q.sent_at desc nulls last;
$$;

-- Logged-in client (or quotes.read staff previewing): one quote, client-safe.
create or replace function public.client_quote(p_quote_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.quote_payload(q.id)
    from public.quotes q
    join public.projects p on p.id = q.project_id
   where q.id = p_quote_id
     and (public.authorize('quotes.read')
          or (private.jwt_role() = 'client'
              and p.client_id = private.jwt_uuid('client_id')
              and q.status not in ('draft', 'superseded')));
$$;

-- Request IP from PostgREST headers; null if absent or malformed.
create or replace function private.request_ip()
returns inet
language plpgsql
stable
set search_path = ''
as $$
declare
  v text := split_part(coalesce(
              current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for',
              current_setting('request.headers', true)::jsonb ->> 'x-real-ip', ''), ',', 1);
begin
  return nullif(btrim(v), '')::inet;
exception when others then
  return null;
end;
$$;

create or replace function private.request_user_agent()
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  return left(current_setting('request.headers', true)::jsonb ->> 'user-agent', 500);
exception when others then
  return null;
end;
$$;

-- Shared approval writer: evidence row, quote status, stage advance, timeline.
create or replace function private.record_approval(
  p_project uuid, p_quote uuid, p_kind public.approval_kind, p_signed_name text,
  p_signature_path text, p_signed_by uuid, p_link uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_target public.project_stage := case p_kind
    when 'quote'    then 'approved'::public.project_stage
    when 'drawings' then 'drawings_approved'::public.project_stage
    when 'samples'  then 'samples_approved'::public.project_stage
  end;
begin
  if nullif(btrim(p_signed_name), '') is null then
    raise exception 'signed_name is required' using errcode = '22023';
  end if;

  insert into public.approvals (project_id, quote_id, kind, signed_name, signature_path,
                                ip, user_agent, signed_by, portal_link_id)
  values (p_project, p_quote, p_kind, btrim(p_signed_name), p_signature_path,
          private.request_ip(), private.request_user_agent(), p_signed_by, p_link)
  returning id into v_id;

  if p_kind = 'quote' and p_quote is not null then
    update public.quotes set status = 'approved', approved_at = now() where id = p_quote;
  end if;

  if v_target is not null then
    update public.projects set stage = v_target where id = p_project and stage < v_target;
  end if;

  insert into public.project_events (project_id, kind, title, visibility, meta, actor_id)
  values (p_project, 'approval', initcap(p_kind::text) || ' approved by ' || btrim(p_signed_name),
          'client', jsonb_build_object('approval_id', v_id, 'quote_id', p_quote), p_signed_by);
  return v_id;
end;
$$;

-- Logged-in client signs a quote / drawings / samples for their own project.
create or replace function public.client_approve(
  p_quote_id uuid, p_kind public.approval_kind, p_signed_name text, p_signature_path text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  if not public.authorize('quotes.approve') or private.jwt_role() is distinct from 'client' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select q.project_id into v_project
    from public.quotes q join public.projects p on p.id = q.project_id
   where q.id = p_quote_id
     and p.client_id = private.jwt_uuid('client_id')
     and q.status in ('sent', 'viewed', 'approved');
  if v_project is null then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;

  return private.record_approval(v_project, p_quote_id, p_kind, p_signed_name,
                                 p_signature_path, auth.uid(), null);
end;
$$;

-- Staff: mint a portal link. Returns the raw token ONCE; only its sha256 is stored.
create or replace function public.create_portal_link(p_quote_id uuid, p_valid_days integer default 30)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token   text;
  v_project uuid;
begin
  if not public.authorize('quotes.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select q.project_id into v_project from public.quotes q where q.id = p_quote_id;
  if v_project is null then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.portal_links (project_id, quote_id, token_hash, expires_at, created_by)
  values (v_project, p_quote_id, sha256(convert_to(v_token, 'UTF8')),
          now() + make_interval(days => greatest(1, least(coalesce(p_valid_days, 30), 365))),
          auth.uid());
  return v_token;
end;
$$;

create or replace function private.portal_link_for(p_token text)
returns public.portal_links
language sql
stable
security definer
set search_path = ''
as $$
  select l.*
    from public.portal_links l
   where p_token ~ '^[0-9a-f]{48}$'
     and l.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and l.revoked_at is null
     and l.expires_at > now();
$$;

-- Anyone holding the token (anon): client-safe quote view. Null if invalid.
create or replace function public.portal_open(token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link  public.portal_links;
  v_quote uuid;
begin
  v_link := private.portal_link_for(token);
  if v_link.id is null then
    return null;
  end if;

  v_quote := coalesce(v_link.quote_id, (
    select q.id from public.quotes q
     where q.project_id = v_link.project_id and q.status not in ('draft', 'superseded')
     order by q.revision desc limit 1));

  update public.portal_links
     set last_opened_at = now(), open_count = open_count + 1
   where id = v_link.id;
  update public.quotes set status = 'viewed' where id = v_quote and status = 'sent';

  return private.quote_payload(v_quote)
         || jsonb_build_object('link', jsonb_build_object('expires_at', v_link.expires_at));
end;
$$;

-- Anyone holding the token: sign. Server should upload the signature image
-- with service_role first and pass its storage path.
create or replace function public.portal_approve(
  token text, p_kind public.approval_kind, p_signed_name text, p_signature_path text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link public.portal_links;
begin
  v_link := private.portal_link_for(token);
  if v_link.id is null then
    raise exception 'link invalid or expired' using errcode = '42501';
  end if;
  return private.record_approval(v_link.project_id, v_link.quote_id, p_kind, p_signed_name,
                                 p_signature_path, null, v_link.id);
end;
$$;

-- Subcontractor responds to a price request addressed to them.
create or replace function public.subcontractor_submit_price(
  p_request_id uuid, p_lo numeric, p_hi numeric, p_firm numeric default null,
  p_notes text default null, p_valid_until date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.authorize('subcontract.respond') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.subcontract_quotes
     set lo = p_lo, hi = p_hi, firm = p_firm, notes = coalesce(p_notes, notes),
         valid_until = p_valid_until, status = 'received', received_at = now()
   where id = p_request_id
     and subcontractor_id = private.jwt_uuid('subcontractor_id')
     and status in ('requested', 'received');
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Function privileges. Supabase grants EXECUTE on new public functions to
-- anon/authenticated by default, so every one is set explicitly.
revoke all on function private.quote_payload(uuid), private.request_ip(), private.request_user_agent(),
  private.record_approval(uuid, uuid, public.approval_kind, text, text, uuid, uuid),
  private.portal_link_for(text)
  from public, anon, authenticated;

revoke all on function public.client_quotes(), public.client_quote(uuid),
  public.client_approve(uuid, public.approval_kind, text, text),
  public.create_portal_link(uuid, integer),
  public.portal_open(text), public.portal_approve(text, public.approval_kind, text, text),
  public.subcontractor_submit_price(uuid, numeric, numeric, numeric, text, date)
  from public, anon, authenticated;

grant execute on function public.client_quotes(), public.client_quote(uuid),
  public.client_approve(uuid, public.approval_kind, text, text),
  public.create_portal_link(uuid, integer),
  public.subcontractor_submit_price(uuid, numeric, numeric, numeric, text, date)
  to authenticated;
grant execute on function public.portal_open(text),
  public.portal_approve(text, public.approval_kind, text, text)
  to anon, authenticated;

-- =============================================================================
-- Assertions: every public table has RLS on and at least one policy.
-- =============================================================================
do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ') into v_missing
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if v_missing is not null then
    raise exception 'RLS not enabled on: %', v_missing;
  end if;

  select string_agg(c.relname, ', ') into v_missing
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);
  if v_missing is not null then
    raise exception 'No policies on: %', v_missing;
  end if;

  -- Mirrors and audit must have no write policies for anyone.
  if exists (select 1 from pg_policies
              where schemaname = 'public'
                and tablename in ('invoices_mirror', 'bills_mirror', 'bank_transactions_mirror',
                                  'payslips_mirror', 'audit_log')
                and cmd <> 'SELECT') then
    raise exception 'write policy found on a mirror/audit table';
  end if;
end;
$$;
