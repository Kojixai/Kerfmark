-- =============================================================================
-- Brackenbury OS :: 001 init
-- Tables, enums, foreign keys, indexes, updated_at triggers.
-- Security (roles, permissions, JWT hook, RLS, policies) lives in 002.
-- Target: Supabase, Postgres 15+.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Helpers that must never be exposed through PostgREST live in "private".
create schema if not exists private;
revoke all on schema private from public;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum
  ('director', 'office', 'workshop', 'fitter', 'subcontractor', 'client');

create type public.sector as enum ('residential', 'marine', 'aviation');

-- Order matters: stage comparisons (stage < 'approved') rely on it.
create type public.project_stage as enum (
  'enquiry', 'estimating', 'quote_sent', 'approved', 'deposit_paid',
  'drawings_approved', 'samples_approved', 'in_production', 'delivered',
  'installed', 'final_invoice'
);

-- supply_only = workshop manufacture, outside CIS.
-- supply_and_fit = on-site installation, inside CIS when working for a contractor.
create type public.contract_type as enum ('supply_only', 'supply_and_fit');

create type public.audience as enum ('office', 'team', 'client');
create type public.client_kind as enum ('private', 'business', 'designer', 'contractor', 'shipyard', 'aviation_completion');
create type public.employment_type as enum ('employee', 'apprentice', 'contractor');
create type public.pay_change_kind as enum ('starting', 'rise', 'promotion', 'adjustment', 'leaving');
create type public.training_level as enum ('trainee', 'supervised', 'competent', 'trainer');
create type public.health_kind as enum ('hearing', 'havs', 'skin', 'respiratory', 'other');
create type public.health_outcome as enum ('fit', 'fit_with_restrictions', 'refer', 'unfit');
create type public.cis_status as enum ('unverified', 'gross', 'net_20', 'net_30', 'not_applicable');
create type public.document_kind as enum (
  'drawing', 'quote_pdf', 'contract', 'photo', 'sample_photo', 'specification',
  'certificate', 'fire_test', 'export_evidence', 'delivery_note', 'invoice_pdf', 'other'
);
create type public.price_unit as enum ('sheet', 'm', 'm2', 'm3', 'each', 'kg', 'litre', 'set', 'pair', 'hour');
create type public.price_source as enum ('supplier_quote', 'supplier_invoice', 'xero_bill', 'price_list', 'manual');
create type public.labour_rate_kind as enum ('design', 'cnc', 'bench', 'veneering', 'finishing', 'upholstery', 'fitting', 'project_management');
create type public.estimate_status as enum ('draft', 'review', 'issued', 'superseded', 'archived');
create type public.grain_dir as enum ('none', 'length', 'width');
create type public.subquote_status as enum ('requested', 'received', 'accepted', 'declined', 'expired');
create type public.quote_status as enum ('draft', 'sent', 'viewed', 'approved', 'declined', 'superseded', 'expired');
create type public.approval_kind as enum ('quote', 'drawings', 'samples', 'variation', 'handover');
create type public.email_direction as enum ('inbound', 'outbound');
create type public.email_status as enum ('draft', 'queued', 'sent', 'received', 'failed');
create type public.chase_trigger as enum ('quote_unanswered', 'drawings_unapproved', 'samples_unapproved', 'invoice_overdue', 'subcontract_price_missing');
create type public.compliance_result as enum ('pass', 'fail', 'advisory', 'not_done');

-- -----------------------------------------------------------------------------
-- updated_at trigger function
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- Organisation
-- =============================================================================
create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  legal_name       text,
  company_number   text,
  vat_number       text,
  xero_tenant_id   text unique,          -- one Xero organisation per company
  is_primary       boolean not null default false,
  brand_colour     text,
  logo_path        text,                 -- storage path
  address          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index companies_one_primary on public.companies (is_primary) where is_primary;

-- -----------------------------------------------------------------------------
-- Staff. NO pay or rate columns here: pay lives in staff_pay (director only).
-- -----------------------------------------------------------------------------
create table public.staff (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies (id),
  first_name             text not null,
  last_name              text not null,
  email                  text,
  phone                  text,
  job_title              text,
  employment_type        public.employment_type not null default 'employee',
  start_date             date,
  end_date               date,
  holiday_allowance_days numeric(4,1),
  xero_employee_id       text,
  -- Right to work: keep for employment + 2 years, then delete (GDPR).
  rtw_checked_on         date,
  rtw_expires_on         date,
  rtw_document_path      text,
  rtw_delete_after       date generated always as ((end_date + interval '2 years')::date) stored,
  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint staff_dates check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.staff_pay (
  id                     uuid primary key default gen_random_uuid(),
  staff_id               uuid not null references public.staff (id) on delete cascade,
  effective_from         date not null,
  change_kind            public.pay_change_kind not null default 'rise',
  annual_salary          numeric(12,2),
  hourly_rate            numeric(8,2),
  contracted_hours_week  numeric(4,1),
  employer_ni_pct        numeric(5,2),
  employer_pension_pct   numeric(5,2),
  notes                  text,
  created_by             uuid references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint staff_pay_some_amount check (annual_salary is not null or hourly_rate is not null),
  unique (staff_id, effective_from)
);

create table public.staff_certificates (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references public.staff (id) on delete cascade,
  name          text not null,          -- e.g. CSCS, IPAF, PASMA, First Aid at Work
  issuer        text,
  cert_number   text,
  issued_on     date,
  expires_on    date,
  storage_path  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Machine sign-offs (PUWER training records).
create table public.staff_training (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references public.staff (id) on delete cascade,
  machine          text not null,        -- e.g. 'Panel saw', 'Spindle moulder', 'CNC router'
  level            public.training_level not null default 'trainee',
  signed_off_by    uuid references public.staff (id) on delete set null,
  signed_off_on    date,
  refresher_due    date,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (staff_id, machine)
);

create table public.health_surveillance (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references public.staff (id) on delete cascade,
  kind          public.health_kind not null,
  assessed_on   date not null,
  next_due      date,
  outcome       public.health_outcome,
  provider      text,
  notes         text,
  storage_path  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- Clients, contacts, subcontractors
-- =============================================================================
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id),
  name              text not null,
  kind              public.client_kind not null default 'private',
  email             text,
  phone             text,
  address           text,
  country_code      char(2) not null default 'GB',
  lat               double precision,
  lng               double precision,
  xero_contact_id   text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  role        text,                    -- e.g. 'Interior designer', 'Captain', 'PA'
  email       text,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.subcontractors (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id),
  name                  text not null,
  trade                 text not null,   -- e.g. 'Gilding', 'Stone', 'Leather', 'Polishing'
  email                 text,
  phone                 text,
  address               text,
  cis_status            public.cis_status not null default 'unverified',
  cis_verified_on       date,
  insurance_expires_on  date,
  xero_contact_id       text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- =============================================================================
-- Profiles: one per auth user. Links to exactly the right party for the role.
-- =============================================================================
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  role              public.app_role not null,
  display_name      text,
  staff_id          uuid unique references public.staff (id) on delete restrict,
  client_id         uuid references public.clients (id) on delete restrict,
  subcontractor_id  uuid references public.subcontractors (id) on delete restrict,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_role_link check (
    case role
      when 'subcontractor' then subcontractor_id is not null and staff_id is null and client_id is null
      when 'client'        then client_id is not null and staff_id is null and subcontractor_id is null
      else                      staff_id is not null and client_id is null and subcontractor_id is null
    end
  )
);

-- =============================================================================
-- Projects
-- =============================================================================
create table public.projects (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies (id),
  client_id                 uuid not null references public.clients (id),
  ref                       text not null unique,          -- e.g. BH-2026-014
  name                      text not null,                 -- real name; hidden from workshop when nda
  nda                       boolean not null default false,
  codename                  text,
  sector                    public.sector not null,
  stage                     public.project_stage not null default 'enquiry',
  stage_changed_at          timestamptz not null default now(),
  contract_type             public.contract_type not null default 'supply_only',
  cis_applies               boolean generated always as (contract_type = 'supply_and_fit') stored,
  project_manager_id        uuid references public.staff (id) on delete set null,
  site_address              text,
  site_contact_name         text,
  site_contact_phone        text,
  country_code              char(2) not null default 'GB',
  lat                       double precision,
  lng                       double precision,
  currency                  char(3) not null default 'GBP',
  target_delivery           date,
  -- VAT export evidence (zero-rating needs proof of export).
  is_export                 boolean not null default false,
  export_destination        text,
  export_vessel_or_aircraft text,       -- yacht name / aircraft registration
  export_date               date,
  export_evidence_ref       text,       -- e.g. MRN / bill of lading / AWB number
  export_evidence_path      text,       -- storage path
  export_evidence_verified  boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint projects_nda_codename check (not nda or nullif(btrim(codename), '') is not null),
  constraint projects_export_fields check (is_export or (export_evidence_ref is null and export_evidence_path is null))
);
create index projects_stage_idx on public.projects (stage);
create index projects_sector_idx on public.projects (sector);

create table public.project_assignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  staff_id    uuid not null references public.staff (id) on delete cascade,
  role        text,                    -- e.g. 'lead fitter', 'maker'
  starts_on   date,
  ends_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, staff_id)
);

create table public.subcontract_assignments (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  subcontractor_id  uuid not null references public.subcontractors (id) on delete cascade,
  scope             text,
  status            text not null default 'active' check (status in ('invited', 'active', 'complete', 'cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, subcontractor_id)
);

create table public.project_events (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  kind         text not null,           -- 'stage_change', 'note', 'email', 'approval', 'site_visit', ...
  title        text not null,
  body         text,
  visibility   public.audience not null default 'office',
  meta         jsonb not null default '{}'::jsonb,
  actor_id     uuid references auth.users (id) on delete set null,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index project_events_project_time_idx on public.project_events (project_id, occurred_at desc);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id),
  project_id    uuid references public.projects (id) on delete cascade,
  kind          public.document_kind not null,
  title         text not null,
  storage_path  text not null,
  revision      text not null default 'A',
  visibility    public.audience not null default 'office',
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (storage_path)
);

-- =============================================================================
-- Price book
-- =============================================================================
create table public.price_items (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique,
  name            text not null,
  category        text,                    -- 'board', 'timber', 'veneer', 'hardware', 'leather', 'finish'
  unit            public.price_unit not null,
  price           numeric(12,4) not null check (price >= 0),
  currency        char(3) not null default 'GBP',
  supplier        text,
  source          public.price_source not null default 'manual',
  priced_at       date not null default current_date,
  valid_until     date,
  sheet_length_mm numeric(8,1),
  sheet_width_mm  numeric(8,1),
  thickness_mm    numeric(6,2),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint price_items_sheet_dims check (unit <> 'sheet' or (sheet_length_mm is not null and sheet_width_mm is not null))
);

create table public.price_history (
  id             uuid primary key default gen_random_uuid(),
  price_item_id  uuid not null references public.price_items (id) on delete cascade,
  price          numeric(12,4) not null,
  currency       char(3) not null default 'GBP',
  source         public.price_source not null,
  supplier       text,
  priced_at      date not null,
  recorded_by    uuid references auth.users (id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index price_history_item_time_idx on public.price_history (price_item_id, priced_at desc);

create table public.labour_rates (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id),
  rate_kind        public.labour_rate_kind not null,
  cost_per_hour    numeric(8,2) not null,   -- real cost (payroll incl. employer NI + pension)
  charge_per_hour  numeric(8,2) not null,
  effective_from   date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (company_id, rate_kind, effective_from)
);

-- =============================================================================
-- Estimating (internal: costs, margins, labour). Never client-visible.
-- =============================================================================
create table public.estimates (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  revision       integer not null default 1 check (revision > 0),
  status         public.estimate_status not null default 'draft',
  margin_pct     numeric(5,2) not null default 30 check (margin_pct between -100 and 100),
  overhead_pct   numeric(5,2) not null default 15 check (overhead_pct >= 0),
  overhead_base  text not null default 'labour' check (overhead_base in ('labour', 'all_costs')),
  contingency_pct numeric(5,2) not null default 0 check (contingency_pct >= 0),
  notes          text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (project_id, revision)
);

create table public.estimate_items (
  id           uuid primary key default gen_random_uuid(),
  estimate_id  uuid not null references public.estimates (id) on delete cascade,
  position     integer not null default 0,
  name         text not null,               -- e.g. 'Saloon sideboard'
  description  text,
  qty          numeric(10,2) not null default 1 check (qty > 0),
  drawing_ref  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Cutting list. Deliberately cost-free: costs live in part_costs (prices.read).
-- project_id is denormalised (set by trigger) so workshop RLS needs no join
-- through the price-protected estimate tables.
create table public.parts (
  id               uuid primary key default gen_random_uuid(),
  estimate_item_id uuid not null references public.estimate_items (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  name             text not null,
  material         text,                     -- human-readable, e.g. '18mm oak-veneered MDF'
  price_item_id    uuid references public.price_items (id) on delete set null,
  length_mm        numeric(8,1) not null check (length_mm > 0),
  width_mm         numeric(8,1) not null check (width_mm > 0),
  thickness_mm     numeric(6,2) not null check (thickness_mm > 0),
  qty              integer not null default 1 check (qty > 0),
  grain            public.grain_dir not null default 'length',
  edging_m         numeric(8,2) not null default 0 check (edging_m >= 0),
  confidence       smallint check (confidence between 0 and 100),
  checked          boolean not null default false,
  pos_x            numeric(9,1),
  pos_y            numeric(9,1),
  pos_z            numeric(9,1),
  dir              text check (dir in ('x', 'y', 'z')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.part_costs (
  part_id      uuid primary key references public.parts (id) on delete cascade,
  unit_cost    numeric(12,4) not null,
  waste_pct    numeric(5,2) not null default 10,
  edging_cost  numeric(12,4) not null default 0,
  line_cost    numeric(12,2) not null,
  priced_at    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.estimate_extras (
  id           uuid primary key default gen_random_uuid(),
  estimate_id  uuid not null references public.estimates (id) on delete cascade,
  description  text not null,               -- 'Delivery to Southampton', 'Crating'
  qty          numeric(10,2) not null default 1,
  unit_cost    numeric(12,2) not null default 0,
  markup_pct   numeric(5,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.estimate_operations (
  id               uuid primary key default gen_random_uuid(),
  estimate_id      uuid not null references public.estimates (id) on delete cascade,
  estimate_item_id uuid references public.estimate_items (id) on delete cascade,
  operation        text not null,           -- 'Veneer matching', 'Spray lacquer'
  hours            numeric(8,2) not null check (hours >= 0),
  rate_kind        public.labour_rate_kind not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.subcontract_quotes (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  estimate_id       uuid references public.estimates (id) on delete set null,
  subcontractor_id  uuid not null references public.subcontractors (id),
  description       text not null,
  lo                numeric(12,2),           -- ballpark range
  hi                numeric(12,2),
  firm              numeric(12,2),           -- firm price once received
  status            public.subquote_status not null default 'requested',
  requested_at      timestamptz not null default now(),
  received_at       timestamptz,
  valid_until       date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint subcontract_quotes_range check (lo is null or hi is null or lo <= hi)
);

create table public.sheet_layouts (
  id               uuid primary key default gen_random_uuid(),
  estimate_id      uuid not null references public.estimates (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  price_item_id    uuid references public.price_items (id) on delete set null,
  material         text,
  sheet_length_mm  numeric(8,1) not null,
  sheet_width_mm   numeric(8,1) not null,
  thickness_mm     numeric(6,2),
  sheets_used      integer not null default 0,
  utilisation_pct  numeric(5,2),
  layout           jsonb not null default '[]'::jsonb,  -- [{sheet, parts:[{part_id,x,y,rot}]}]
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- =============================================================================
-- Client-facing quotes
-- =============================================================================
create table public.quotes (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  estimate_id       uuid references public.estimates (id) on delete set null,
  number            text not null unique,      -- e.g. Q-2026-031
  revision          integer not null default 1,
  status            public.quote_status not null default 'draft',
  currency          char(3) not null default 'GBP',
  subtotal          numeric(12,2) not null default 0,
  vat_rate          numeric(5,2) not null default 20,
  vat_amount        numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  payment_schedule  jsonb not null default '[]'::jsonb,  -- [{label, pct, due}]
  client_message    text,
  valid_until       date,
  sent_at           timestamptz,
  approved_at       timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, revision)
);

create table public.quote_lines (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quotes (id) on delete cascade,
  position     integer not null default 0,
  description  text not null,
  qty          numeric(10,2) not null default 1,
  unit_price   numeric(12,2) not null default 0,
  line_total   numeric(12,2) generated always as (round(qty * unit_price, 2)) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.approvals (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  quote_id        uuid references public.quotes (id) on delete set null,
  document_id     uuid references public.documents (id) on delete set null,
  kind            public.approval_kind not null,
  signed_name     text not null,
  signature_path  text,                   -- storage path of signature image
  ip              inet,
  user_agent      text,
  signed_by       uuid references auth.users (id) on delete set null, -- null when signed via portal link
  portal_link_id  uuid,                   -- FK added below (portal_links defined later)
  signed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Secret client links. Only the sha256 of the token is stored.
create table public.portal_links (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  quote_id         uuid references public.quotes (id) on delete cascade,
  token_hash       bytea not null unique check (octet_length(token_hash) = 32),
  expires_at       timestamptz not null default now() + interval '30 days',
  revoked_at       timestamptz,
  last_opened_at   timestamptz,
  open_count       integer not null default 0,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.approvals
  add constraint approvals_portal_link_fk foreign key (portal_link_id)
  references public.portal_links (id) on delete set null;

-- =============================================================================
-- Xero mirrors (written only by the sync job using service_role)
-- =============================================================================
create table public.invoices_mirror (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id),
  xero_invoice_id  text not null,
  project_id       uuid references public.projects (id) on delete set null,
  client_id        uuid references public.clients (id) on delete set null,
  invoice_number   text,
  contact_name     text,
  status           text,
  invoice_date     date,
  due_date         date,
  currency         char(3),
  subtotal         numeric(12,2),
  total_tax        numeric(12,2),
  total            numeric(12,2),
  amount_due       numeric(12,2),
  amount_paid      numeric(12,2),
  raw              jsonb,
  synced_at        timestamptz not null default now(),
  unique (company_id, xero_invoice_id)
);

create table public.bills_mirror (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id),
  xero_invoice_id  text not null,            -- Xero calls bills ACCPAY invoices
  project_id       uuid references public.projects (id) on delete set null,
  subcontractor_id uuid references public.subcontractors (id) on delete set null,
  reference        text,
  supplier_name    text,
  status           text,
  bill_date        date,
  due_date         date,
  currency         char(3),
  subtotal         numeric(12,2),
  total_tax        numeric(12,2),
  total            numeric(12,2),
  amount_due       numeric(12,2),
  raw              jsonb,
  synced_at        timestamptz not null default now(),
  unique (company_id, xero_invoice_id)
);

create table public.bank_transactions_mirror (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id),
  xero_transaction_id  text not null,
  bank_account         text,
  type                 text,                 -- RECEIVE / SPEND / TRANSFER
  contact_name         text,
  reference            text,
  txn_date             date,
  currency             char(3),
  total                numeric(12,2),
  is_reconciled        boolean,
  project_id           uuid references public.projects (id) on delete set null,
  raw                  jsonb,
  synced_at            timestamptz not null default now(),
  unique (company_id, xero_transaction_id)
);

-- Xero Payroll mirror: payslips. Gated by pay.read, NOT xero.read.
create table public.payslips_mirror (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id),
  xero_payslip_id   text not null,
  xero_employee_id  text,
  staff_id          uuid references public.staff (id) on delete set null,
  pay_run_date      date,
  period_start      date,
  period_end        date,
  gross             numeric(12,2),
  tax               numeric(12,2),
  employee_ni       numeric(12,2),
  employer_ni       numeric(12,2),
  employee_pension  numeric(12,2),
  employer_pension  numeric(12,2),
  net               numeric(12,2),
  raw               jsonb,
  synced_at         timestamptz not null default now(),
  unique (company_id, xero_payslip_id)
);

-- =============================================================================
-- Email, chasing
-- =============================================================================
create table public.email_templates (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id),
  key           text not null,             -- 'quote_chase_1'
  name          text not null,
  subject       text not null,
  body          text not null,             -- {{client.name}}, {{quote.total}}, ...
  merge_fields  text[] not null default '{}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, key)
);

create table public.chase_rules (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id),
  name          text not null,
  trigger       public.chase_trigger not null,
  days_after    integer not null check (days_after > 0),
  repeat_every_days integer check (repeat_every_days is null or repeat_every_days > 0),
  max_chases    integer not null default 3 check (max_chases >= 0),
  template_id   uuid references public.email_templates (id) on delete set null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.emails (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id),
  project_id      uuid references public.projects (id) on delete set null,
  client_id       uuid references public.clients (id) on delete set null,
  direction       public.email_direction not null,
  status          public.email_status not null default 'draft',
  message_id      text unique,              -- RFC 5322 Message-ID
  thread_id       text,
  from_address    text not null,
  to_addresses    text[] not null default '{}',
  cc_addresses    text[] not null default '{}',
  subject         text,
  body_text       text,
  body_html       text,
  template_id     uuid references public.email_templates (id) on delete set null,
  chase_rule_id   uuid references public.chase_rules (id) on delete set null,
  sent_by         uuid references auth.users (id) on delete set null,
  sent_at         timestamptz,
  received_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index emails_thread_idx on public.emails (thread_id);

-- =============================================================================
-- Compliance
-- =============================================================================
create table public.compliance_checks (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id),
  name             text not null,           -- 'LEV thorough examination'
  legal_basis      text,                    -- 'COSHH Reg 9'
  interval_months  integer check (interval_months is null or interval_months > 0),
  owner_staff_id   uuid references public.staff (id) on delete set null,
  next_due         date,
  applies_to       text,                    -- 'Dust extraction', 'Building', 'Forklift'
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index compliance_checks_next_due_idx on public.compliance_checks (next_due) where active;

create table public.compliance_log (
  id             uuid primary key default gen_random_uuid(),
  check_id       uuid not null references public.compliance_checks (id) on delete cascade,
  done_on        date not null,
  done_by        text,                       -- person or contractor
  result         public.compliance_result not null,
  notes          text,
  evidence_path  text,
  recorded_by    uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Roll the check's next_due forward when a passing/advisory log is recorded.
create or replace function private.compliance_roll_due()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.result in ('pass', 'advisory') then
    update public.compliance_checks c
       set next_due = (new.done_on + make_interval(months => c.interval_months))::date
     where c.id = new.check_id
       and c.interval_months is not null
       and (c.next_due is null or c.next_due < (new.done_on + make_interval(months => c.interval_months))::date);
  end if;
  return new;
end;
$$;
create trigger compliance_log_roll_due
  after insert on public.compliance_log
  for each row execute function private.compliance_roll_due();

-- =============================================================================
-- SOPs
-- =============================================================================
create table public.sops (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id),
  slug        text not null unique,
  title       text not null,
  applies_to  text,                       -- 'Spray booth', 'Yacht install'
  version     integer not null default 1,
  owner_id    uuid references public.staff (id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.sop_steps (
  id          uuid primary key default gen_random_uuid(),
  sop_id      uuid not null references public.sops (id) on delete cascade,
  position    integer not null,
  title       text not null,
  body        text,
  hazard      text,
  image_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sop_id, position)
);

-- =============================================================================
-- Audit log
-- =============================================================================
create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_row     jsonb,
  new_row     jsonb
);
create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_at_idx on public.audit_log (at desc);

-- =============================================================================
-- Domain triggers
-- =============================================================================

-- parts.project_id always follows its estimate item.
create or replace function private.parts_set_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select e.project_id into new.project_id
    from public.estimate_items ei
    join public.estimates e on e.id = ei.estimate_id
   where ei.id = new.estimate_item_id;
  if new.project_id is null then
    raise exception 'estimate_item % not found', new.estimate_item_id;
  end if;
  return new;
end;
$$;
create trigger parts_set_project
  before insert or update of estimate_item_id on public.parts
  for each row execute function private.parts_set_project();

-- sheet_layouts.project_id follows its estimate.
create or replace function private.sheet_layouts_set_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select e.project_id into new.project_id from public.estimates e where e.id = new.estimate_id;
  return new;
end;
$$;
create trigger sheet_layouts_set_project
  before insert or update of estimate_id on public.sheet_layouts
  for each row execute function private.sheet_layouts_set_project();

-- Record price changes in price_history.
create or replace function private.price_items_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price or new.priced_at is distinct from old.priced_at then
    insert into public.price_history (price_item_id, price, currency, source, supplier, priced_at, recorded_by)
    values (new.id, new.price, new.currency, new.source, new.supplier, new.priced_at, auth.uid());
  end if;
  return new;
end;
$$;
create trigger price_items_history
  after insert or update on public.price_items
  for each row execute function private.price_items_history();

-- Keep quote totals in step with lines.
create or replace function private.quote_recalc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
     set subtotal   = s.subtotal,
         vat_amount = round(s.subtotal * q.vat_rate / 100, 2),
         total      = s.subtotal + round(s.subtotal * q.vat_rate / 100, 2)
    from (select coalesce(sum(l.line_total), 0) as subtotal
            from public.quote_lines l where l.quote_id = v_quote) s
   where q.id = v_quote;
  if tg_op = 'UPDATE' and old.quote_id is distinct from new.quote_id then
    update public.quotes q
       set subtotal   = s.subtotal,
           vat_amount = round(s.subtotal * q.vat_rate / 100, 2),
           total      = s.subtotal + round(s.subtotal * q.vat_rate / 100, 2)
      from (select coalesce(sum(l.line_total), 0) as subtotal
              from public.quote_lines l where l.quote_id = old.quote_id) s
     where q.id = old.quote_id;
  end if;
  return null;
end;
$$;
create trigger quote_lines_recalc
  after insert or update or delete on public.quote_lines
  for each row execute function private.quote_recalc();

-- Stage changes: stamp time and add a timeline event.
create or replace function private.projects_stage_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    insert into public.project_events (project_id, kind, title, visibility, meta, actor_id)
    values (new.id, 'stage_change',
            'Stage: ' || replace(old.stage::text, '_', ' ') || ' -> ' || replace(new.stage::text, '_', ' '),
            'team',
            jsonb_build_object('from', old.stage, 'to', new.stage),
            auth.uid());
  end if;
  return new;
end;
$$;
create trigger projects_stage_event
  before update of stage on public.projects
  for each row execute function private.projects_stage_event();

-- Generic audit trigger.
create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, actor_role, table_name, record_id, action, old_row, new_row)
  values (auth.uid(),
          coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role', current_user),
          tg_table_name,
          coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'part_id', v_old ->> 'part_id'),
          tg_op, v_old, v_new);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'staff', 'staff_pay', 'clients', 'projects', 'price_items',
    'labour_rates', 'estimates', 'quotes', 'quote_lines', 'approvals',
    'portal_links', 'documents', 'compliance_checks'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.audit_row()', t || '_audit', t);
  end loop;
end;
$$;

-- updated_at triggers on every public table that has the column.
do $$
declare r record;
begin
  for r in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'updated_at'
       and t.table_type = 'BASE TABLE'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', r.table_name);
  end loop;
end;
$$;

-- Index every single-column foreign key that is not already the leading
-- column of an index (RLS policies and joins depend on these).
do $$
declare r record;
begin
  for r in
    select cl.relname as tbl, a.attname as col
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
     where con.contype = 'f' and n.nspname = 'public' and array_length(con.conkey, 1) = 1
       and not exists (
         select 1 from pg_index i
          where i.indrelid = con.conrelid and i.indkey[0] = con.conkey[1])
  loop
    execute format('create index %I on public.%I (%I)', r.tbl || '_' || r.col || '_idx', r.tbl, r.col);
  end loop;
end;
$$;

-- Guard: pay must never be stored on staff.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'staff'
       and column_name ~* '(pay|salary|wage|rate|rise|ni_number)'
  ) then
    raise exception 'staff must not carry pay or rate columns; use staff_pay';
  end if;
end;
$$;
