# Brackenbury OS: Supabase schema

| File | What it holds |
| --- | --- |
| `migrations/20261024000001_init.sql` | Enums, tables, FKs, indexes, `updated_at`, audit, price-history and quote-total triggers |
| `migrations/20261024000002_auth_rls.sql` | Permissions and `role_permissions`, JWT hook, `authorize()`, RLS and policies on every table, workshop views, client and portal functions |
| `seed.sql` | Invented demo data: 3 companies, 5 staff, 4 clients, 2 subcontractors, 3 projects, a price book, one estimate and one quote |

## Apply

Locally (Docker running):

```bash
supabase start
supabase db reset        # runs both migrations, then seed.sql
```

Hosted project:

```bash
supabase link --project-ref <project-ref>
supabase db push         # migrations only; seed.sql is NOT run
```

Role permissions are inserted by migration 002, not by `seed.sql`. `db push` never runs the seed, so a hosted project still gets them.

## Enable the access-token hook

1. Go to Dashboard > Authentication > Hooks > **Customize Access Token (JWT) Claims**.
2. Choose type **Postgres**, schema `public`, function `custom_access_token_hook`. Save.
3. Locally, add this to `supabase/config.toml`:
   ```toml
   [auth.hook.custom_access_token]
   enabled = true
   uri = "pg-functions://postgres/public/custom_access_token_hook"
   ```

The hook adds `user_role`, `staff_id`, `client_id` and `subcontractor_id` claims from `public.profiles`. If a user has no active profile, all four claims are null and the user sees nothing. A role change only takes effect when the user's token refreshes (sign out and back in, or call `refreshSession()`).

## Creating a user

1. Create the auth user (Dashboard, or `auth.admin.createUser` with the service key).
2. Insert their profile using the service role or a director login. The CHECK constraint needs exactly the right link for the role:
   - staff roles (director, office, workshop, fitter) need `staff_id`
   - `subcontractor` needs `subcontractor_id`
   - `client` needs `client_id`

```sql
insert into public.profiles (id, role, staff_id) values ('<auth uid>', 'workshop', '<staff id>');
```

## Who sees what

R = read, W = write, own = only rows linked to the user, asg = only projects they are assigned to.

| Area | director | office | workshop | fitter | subcontractor | client |
| --- | --- | --- | --- | --- | --- | --- |
| `projects` table | RW | RW | none (uses `workshop_projects`) | R asg | R asg | R own |
| `workshop_projects` view (codename if NDA, no client) | R | R | R all | R asg | R asg | R own |
| Clients, contacts | RW | RW | none | none | none | R own |
| Staff | RW | RW | R own | R own | none | none |
| `staff_pay`, `payslips_mirror` (pay) | RW | none | none | none | none | none |
| Certificates | RW | RW | R own | R own | none | none |
| Machine sign-offs | RW | RW | R all | R own | none | none |
| Health surveillance | RW | RW | R own | R own | none | none |
| Price book, price history, labour rates | RW | RW | none | none | none | none |
| Estimates, extras, operations, `part_costs` | RW | RW | none | none | none | none |
| `parts`, `parts_workshop`, `sheet_layouts`, `estimate_items` (no money) | RW | RW | R all | R asg | none | none |
| Subcontract quotes | RW | RW | none | none | R own, submits through `subcontractor_submit_price()` | none |
| `quotes`, `quote_lines` | RW | RW | none | none | none | only through `client_quotes()` / `client_quote()` |
| Approvals | R, sign | R | none | none | none | R own, signs through `client_approve()` |
| Portal links | RW | RW | none | none | none | anon: `portal_open()` / `portal_approve()` with the token |
| Documents, timeline (`visibility` office / team / client) | all | all | team + client | team + client, asg | team + client, asg | client, own |
| Xero invoices, bills, bank | R | R | none | none | none | none |
| Emails, templates, chase rules | RW | RW | none | none | none | none |
| Compliance checks and log | RW | RW | R | none | none | none |
| SOPs | RW | RW | R published | R published | none | none |
| Audit log | R | none | none | none | none | none |
| Profiles and roles | RW | R | own | own | own | own |

Nobody signed in, anon included, can write to the Xero mirrors (`invoices_mirror`, `bills_mirror`, `bank_transactions_mirror`, `payslips_mirror`) or to `audit_log`. The sync job writes the mirrors with the service role.

## Rules worth knowing

- **Permissions, not role names.** Policies call `public.authorize('prices.read')`. The full matrix is in `role_permissions`. To change who can do what, edit those rows; the policies stay as they are.
- **Pay is never on `staff`.** Migration 001 fails if a pay-like column is added to `staff`. The payroll mirror is gated by `pay.read`, not `xero.read`.
- **The cutting list has no money in it.** `parts` holds no cost columns; costs are in `part_costs` (`prices.read`). `parts.price_item_id` is an FK to `price_items.id`, and the workshop cannot read that table.
- **NDA.** Workshop logins cannot select from `projects`. They get `workshop_projects`, which shows the codename instead of the name and leaves out the client and site.
- **Portal tokens.** `create_portal_link(quote_id, days)` returns a 48-hex token once. Only `sha256(token)` is stored. `portal_open(token)` returns the client-safe JSON: company, project, quote totals, lines, payment schedule, client-visible documents and approvals. It never returns estimates, prices, margin or labour.
- **Approvals.** These are append-only evidence rows. IP and user agent come from the request headers. A quote, drawings or samples approval moves the project stage forward and writes a timeline event.
- **TRUNCATE is revoked** from `authenticated`, because TRUNCATE bypasses RLS.

## Not covered here

- Storage buckets and storage RLS. Paths are stored as text. Upload signatures and portal files from the server with the service role.
- Limiting a user to particular companies. Every staff user currently sees all companies.
- Rate limiting `portal_open`. Do it at the edge or API route.
- The Supabase linter will flag `workshop_projects` as a "security definer view". This is deliberate: it is the only route the workshop has to project rows, and it filters with `private.can_see_project_ops()`.
