-- =============================================================================
-- Brackenbury OS :: demo seed (local `supabase db reset` only)
-- All people, clients, vessels and prices below are invented.
--
-- Role permissions are NOT seeded here: they are created by migration
-- 20261024000002_auth_rls.sql so that `supabase db push` to a hosted project
-- (which never runs seed.sql) still has them. This file only re-asserts the
-- critical director/pay rule so a bad local edit fails loudly.
-- =============================================================================

do $$
begin
  if not exists (select 1 from public.role_permissions where role = 'director' and permission = 'pay.read')
     or exists (select 1 from public.role_permissions where permission = 'pay.read' and role <> 'director') then
    raise exception 'role_permissions missing or pay.read granted beyond director; check migration 002';
  end if;
end;
$$;

-- Companies -------------------------------------------------------------------
insert into public.companies (id, name, legal_name, xero_tenant_id, is_primary, brand_colour) values
  ('10000000-0000-4000-8000-000000000001', 'Brackenbury', 'Brackenbury Home Ltd', 'demo-tenant-brackenbury', true,  '#2f3a2f'),
  ('10000000-0000-4000-8000-000000000002', 'Sister Co A', 'Sister Company A Ltd', 'demo-tenant-sister-a',    false, '#5a4632'),
  ('10000000-0000-4000-8000-000000000003', 'Sister Co B', 'Sister Company B Ltd', 'demo-tenant-sister-b',    false, '#30475e');

-- Staff (no pay here) -----------------------------------------------------------
insert into public.staff (id, company_id, first_name, last_name, email, job_title, employment_type, start_date, holiday_allowance_days, rtw_checked_on) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Harriet', 'Demo-Director', 'director@example.test', 'Director',          'employee',   '2018-06-01', 28, '2018-05-20'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Owen',    'Demo-Office',   'office@example.test',   'Office manager',    'employee',   '2020-03-02', 28, '2020-02-20'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Wes',     'Demo-Bench',    'workshop@example.test', 'Cabinet maker',     'employee',   '2021-09-06', 28, '2021-08-30'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Fay',     'Demo-Fitter',   'fitter@example.test',   'Site fitter',       'employee',   '2022-01-10', 28, '2022-01-04'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Alfie',   'Demo-Apprentice', null,                  'Apprentice joiner', 'apprentice', '2025-09-01', 28, '2025-08-20');

insert into public.staff_pay (staff_id, effective_from, change_kind, annual_salary, contracted_hours_week, employer_ni_pct, employer_pension_pct, notes) values
  ('20000000-0000-4000-8000-000000000003', '2021-09-06', 'starting', 31000, 40, 15, 3, null),
  ('20000000-0000-4000-8000-000000000003', '2025-04-01', 'rise',     34500, 40, 15, 3, 'Annual review'),
  ('20000000-0000-4000-8000-000000000004', '2022-01-10', 'starting', 33000, 40, 15, 3, null),
  ('20000000-0000-4000-8000-000000000002', '2020-03-02', 'starting', 30000, 37.5, 15, 3, null),
  ('20000000-0000-4000-8000-000000000005', '2025-09-01', 'starting', 16500, 40, 0, 3, 'Apprentice rate');

insert into public.staff_certificates (staff_id, name, issuer, issued_on, expires_on) values
  ('20000000-0000-4000-8000-000000000004', 'CSCS Skilled Worker', 'CSCS', '2024-02-01', '2029-02-01'),
  ('20000000-0000-4000-8000-000000000004', 'IPAF 3a/3b',          'IPAF', '2025-05-12', '2030-05-12'),
  ('20000000-0000-4000-8000-000000000003', 'First Aid at Work',   'Demo Training Ltd', '2024-11-04', '2027-11-04');

insert into public.staff_training (staff_id, machine, level, signed_off_by, signed_off_on, refresher_due) values
  ('20000000-0000-4000-8000-000000000003', 'Panel saw',       'competent', '20000000-0000-4000-8000-000000000001', '2021-10-01', '2026-10-01'),
  ('20000000-0000-4000-8000-000000000003', 'Spindle moulder', 'competent', '20000000-0000-4000-8000-000000000001', '2022-03-14', '2027-03-14'),
  ('20000000-0000-4000-8000-000000000005', 'Panel saw',       'supervised','20000000-0000-4000-8000-000000000003', '2025-10-20', null);

insert into public.health_surveillance (staff_id, kind, assessed_on, next_due, outcome, provider) values
  ('20000000-0000-4000-8000-000000000003', 'hearing',     '2025-11-03', '2026-11-03', 'fit', 'Demo Occupational Health'),
  ('20000000-0000-4000-8000-000000000003', 'respiratory', '2025-11-03', '2026-11-03', 'fit', 'Demo Occupational Health');

-- Clients, contacts, subcontractors ----------------------------------------------
insert into public.clients (id, company_id, name, kind, email, country_code, lat, lng) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ashcombe Interiors (demo)',     'designer',            'studio@ashcombe.example',  'GB', 51.501, -0.142),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Solent Refit Yard (demo)',      'shipyard',            'projects@solent.example',  'GB', 50.896, -1.404),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Northline Completions (demo)',  'aviation_completion', 'interiors@northline.example', 'CH', 46.238, 6.109),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Mr & Mrs Example',              'private',             'owners@household.example', 'GB', 51.338, -1.611);

insert into public.contacts (client_id, name, role, email, is_primary) values
  ('30000000-0000-4000-8000-000000000001', 'Clara Sample',  'Lead designer',     'clara@ashcombe.example',  true),
  ('30000000-0000-4000-8000-000000000002', 'Ben Placeholder','Project manager',  'ben@solent.example',      true),
  ('30000000-0000-4000-8000-000000000003', 'Ines Fictive',  'Cabin interiors',   'ines@northline.example',  true);

insert into public.subcontractors (id, company_id, name, trade, email, cis_status, insurance_expires_on) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Gildworks (demo)',       'Gilding',  'quotes@gildworks.example', 'gross',  '2027-03-31'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Downland Stone (demo)',  'Stone',    'office@downland.example',  'net_20', '2026-12-31');

-- Projects --------------------------------------------------------------------------
insert into public.projects (id, company_id, client_id, ref, name, nda, codename, sector, stage, contract_type,
                             project_manager_id, site_address, country_code, target_delivery,
                             is_export, export_destination, export_vessel_or_aircraft) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'BH-2026-031', 'Kensington library and bar', false, null, 'residential', 'quote_sent', 'supply_and_fit',
   '20000000-0000-4000-8000-000000000002', 'London W8 (demo)', 'GB', '2027-03-15', false, null, null),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
   'BH-2026-027', 'MY Example Star saloon refit', true, 'HERON', 'marine', 'in_production', 'supply_only',
   '20000000-0000-4000-8000-000000000001', 'Southampton (demo)', 'GB', '2026-12-04', true, 'Monaco', 'MY Example Star'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003',
   'BH-2026-019', 'Long-range jet galley veneer panels', false, null, 'aviation', 'estimating', 'supply_only',
   '20000000-0000-4000-8000-000000000002', 'Geneva (demo)', 'CH', '2027-02-01', true, 'Switzerland', 'HB-DEMO');

insert into public.project_assignments (project_id, staff_id, role) values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'lead fitter'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'maker');

insert into public.subcontract_assignments (project_id, subcontractor_id, scope) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Water gilding to bar canopy');

insert into public.project_events (project_id, kind, title, visibility, occurred_at) values
  ('50000000-0000-4000-8000-000000000001', 'enquiry', 'Enquiry received from designer', 'office', '2026-08-04 09:12+01'),
  ('50000000-0000-4000-8000-000000000001', 'note',    'Site survey booked',             'team',   '2026-08-19 14:30+01'),
  ('50000000-0000-4000-8000-000000000001', 'quote',   'Quote Q-2026-031 sent',          'client', '2026-10-10 16:05+01'),
  ('50000000-0000-4000-8000-000000000002', 'note',    'Veneer flitch selected',         'team',   '2026-09-22 11:00+01');

insert into public.documents (company_id, project_id, kind, title, storage_path, revision, visibility) values
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'drawing',  'GA library elevations', 'projects/BH-2026-031/drawings/GA-01-revB.pdf', 'B', 'client'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'contract', 'Designer terms (internal)', 'projects/BH-2026-031/internal/terms.pdf', 'A', 'office'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'drawing',  'Saloon sideboard shop drawing', 'projects/BH-2026-027/drawings/SB-01-revC.pdf', 'C', 'team');

-- Price book --------------------------------------------------------------------------
insert into public.price_items (id, sku, name, category, unit, price, supplier, source, priced_at, valid_until,
                                sheet_length_mm, sheet_width_mm, thickness_mm) values
  ('60000000-0000-4000-8000-000000000001', 'MDF-MR-18',     'MR MDF 18mm',                     'board',    'sheet', 38.50,  'Demo Board Merchants', 'supplier_quote',   '2026-09-01', '2026-12-01', 2440, 1220, 18),
  ('60000000-0000-4000-8000-000000000002', 'OAK-VMDF-19',   'Crown-cut oak veneered MDF 19mm', 'board',    'sheet', 142.00, 'Demo Board Merchants', 'supplier_invoice', '2026-08-14', null,         2440, 1220, 19),
  ('60000000-0000-4000-8000-000000000003', 'WAL-VMDF-19',   'Black walnut veneered MDF 19mm',  'board',    'sheet', 196.00, 'Demo Veneer Co',       'supplier_quote',   '2026-05-02', '2026-08-02', 2440, 1220, 19),
  ('60000000-0000-4000-8000-000000000004', 'BIRCH-PLY-12',  'Birch ply BB/BB 12mm',            'board',    'sheet', 61.20,  'Demo Board Merchants', 'xero_bill',        '2026-10-03', null,         2440, 1220, 12),
  ('60000000-0000-4000-8000-000000000005', 'OAK-EDGE-22',   'Oak edging tape 22mm pre-glued',  'edging',   'm',     0.95,   'Demo Board Merchants', 'price_list',       '2026-07-01', null,         null, null, 0.6),
  ('60000000-0000-4000-8000-000000000006', 'HINGE-110-SC',  'Soft-close hinge 110 deg',        'hardware', 'each',  4.80,   'Demo Hardware Ltd',    'price_list',       '2026-06-15', null,         null, null, null),
  ('60000000-0000-4000-8000-000000000007', 'RUNNER-500-PO', 'Push-open runner 500mm (pair)',   'hardware', 'pair',  38.40,  'Demo Hardware Ltd',    'price_list',       '2026-06-15', null,         null, null, null),
  ('60000000-0000-4000-8000-000000000008', 'LAC-PU-MATT',   'PU lacquer matt 20 sheen',        'finish',   'litre', 24.10,  'Demo Coatings',        'supplier_invoice', '2026-09-28', null,         null, null, null);

-- A later price rise (writes price_history via trigger).
update public.price_items set price = 39.90, priced_at = '2026-10-15', source = 'xero_bill'
 where sku = 'MDF-MR-18';

insert into public.labour_rates (company_id, rate_kind, cost_per_hour, charge_per_hour, effective_from) values
  ('10000000-0000-4000-8000-000000000001', 'design',             31.00, 75.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'cnc',                28.00, 70.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'bench',              24.50, 58.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'veneering',          26.00, 62.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'finishing',          24.00, 58.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'fitting',            25.50, 60.00, '2026-04-01'),
  ('10000000-0000-4000-8000-000000000001', 'project_management', 33.00, 80.00, '2026-04-01');

-- Estimate for the library project --------------------------------------------------
insert into public.estimates (id, project_id, revision, status, margin_pct, overhead_pct, overhead_base) values
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'issued', 32, 18, 'labour'),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 1, 'issued', 28, 12, 'all_costs');

insert into public.estimate_items (id, estimate_id, position, name, qty, drawing_ref) values
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 1, 'Library bookcase run', 1, 'GA-01'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 2, 'Bar back with gilded canopy', 1, 'GA-02'),
  ('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 1, 'Saloon sideboard', 1, 'SB-01');

insert into public.parts (id, estimate_item_id, name, material, price_item_id, length_mm, width_mm, thickness_mm, qty, grain, edging_m, confidence, checked, pos_x, pos_y, pos_z, dir) values
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Gable',        '19mm oak veneered MDF', '60000000-0000-4000-8000-000000000002', 2400, 350, 19, 4, 'length', 9.6, 96, true,  0,    0, 0, 'y'),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'Shelf',        '19mm oak veneered MDF', '60000000-0000-4000-8000-000000000002',  880, 330, 19, 15, 'length', 13.2, 88, false, 19, 300, 0, 'x'),
  ('72000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', 'Back panel',   '12mm birch ply',        '60000000-0000-4000-8000-000000000004', 2380, 900, 12, 3, 'length', 0, 74, false,  19,  0, 340, 'y'),
  ('72000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000003', 'Carcass top',  '19mm walnut veneered MDF','60000000-0000-4000-8000-000000000003', 2100, 520, 19, 1, 'length', 5.2, 91, true,  0,  860, 0, 'x');

insert into public.part_costs (part_id, unit_cost, waste_pct, edging_cost, line_cost, priced_at) values
  ('72000000-0000-4000-8000-000000000001', 40.27, 12, 9.12, 184.52, '2026-08-14'),
  ('72000000-0000-4000-8000-000000000002', 13.83, 12, 12.54, 244.89, '2026-08-14'),
  ('72000000-0000-4000-8000-000000000003', 44.03, 10, 0,    145.30, '2026-10-03'),
  ('72000000-0000-4000-8000-000000000004', 71.70, 15, 4.94,  87.40, '2026-05-02');

insert into public.estimate_operations (estimate_id, estimate_item_id, operation, hours, rate_kind) values
  ('70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'CNC machining',      6,  'cnc'),
  ('70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Assembly',           22, 'bench'),
  ('70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Spray lacquer',      14, 'finishing'),
  ('70000000-0000-4000-8000-000000000001', null,                                   'Install on site',    32, 'fitting');

insert into public.estimate_extras (estimate_id, description, qty, unit_cost, markup_pct) values
  ('70000000-0000-4000-8000-000000000001', 'Delivery and crating, London', 1, 420, 10);

insert into public.subcontract_quotes (project_id, estimate_id, subcontractor_id, description, lo, hi, firm, status, received_at) values
  ('50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
   'Water gild bar canopy, 23.5ct, approx 1.8 m2', 2400, 3200, 2850, 'received', '2026-09-30 10:00+01'),
  ('50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002',
   'Bar top in honed marble 1800 x 600', 1600, 2400, null, 'requested', null);

insert into public.sheet_layouts (estimate_id, price_item_id, material, sheet_length_mm, sheet_width_mm, thickness_mm, sheets_used, utilisation_pct, layout) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '19mm oak veneered MDF', 2440, 1220, 19, 5, 81.4,
   '[{"sheet":1,"parts":[{"part_id":"72000000-0000-4000-8000-000000000001","x":10,"y":10,"rot":0},{"part_id":"72000000-0000-4000-8000-000000000001","x":10,"y":370,"rot":0}]}]'::jsonb);

-- Client quote ----------------------------------------------------------------------
insert into public.quotes (id, project_id, estimate_id, number, revision, status, vat_rate, payment_schedule, valid_until, sent_at, client_message) values
  ('80000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
   'Q-2026-031', 1, 'sent', 20,
   '[{"label":"Deposit on approval","pct":50},{"label":"On drawings approval","pct":25},{"label":"On installation","pct":25}]'::jsonb,
   '2026-11-30', '2026-10-10 16:05+01', 'Thank you for the opportunity to quote.');

insert into public.quote_lines (quote_id, position, description, qty, unit_price) values
  ('80000000-0000-4000-8000-000000000001', 1, 'Library bookcase run in crown-cut oak, lacquered', 1, 18450),
  ('80000000-0000-4000-8000-000000000001', 2, 'Bar back with water-gilded canopy',               1, 14200),
  ('80000000-0000-4000-8000-000000000001', 3, 'Delivery and installation',                       1, 3650);

-- Email, chasing, compliance, SOPs -------------------------------------------------------
insert into public.email_templates (id, company_id, key, name, subject, body, merge_fields) values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'quote_chase_1', 'Quote chase 1',
   'Your quote {{quote.number}}', 'Dear {{contact.name}}, just checking you received our quote for {{project.name}}.',
   '{contact.name,quote.number,project.name}');

insert into public.chase_rules (company_id, name, trigger, days_after, repeat_every_days, max_chases, template_id) values
  ('10000000-0000-4000-8000-000000000001', 'Quote not answered', 'quote_unanswered', 7, 7, 3, '90000000-0000-4000-8000-000000000001');

insert into public.compliance_checks (company_id, name, legal_basis, interval_months, owner_staff_id, next_due, applies_to) values
  ('10000000-0000-4000-8000-000000000001', 'LEV thorough examination', 'COSHH Reg 9',          14, '20000000-0000-4000-8000-000000000002', '2026-12-01', 'Dust extraction'),
  ('10000000-0000-4000-8000-000000000001', 'Fire risk assessment review', 'RR(FS)O 2005 Art 9', 12, '20000000-0000-4000-8000-000000000001', '2027-01-15', 'Building'),
  ('10000000-0000-4000-8000-000000000001', 'Air receiver written scheme exam', 'PSSR 2000',     14, '20000000-0000-4000-8000-000000000002', '2027-04-01', 'Compressor');

insert into public.sops (id, company_id, slug, title, applies_to, published, owner_id) values
  ('91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'spray-booth-start', 'Spray booth start-up', 'Spray booth', true, '20000000-0000-4000-8000-000000000003');

insert into public.sop_steps (sop_id, position, title, body, hazard) values
  ('91000000-0000-4000-8000-000000000001', 1, 'Check extraction', 'Switch on extraction and confirm manometer reads in the green band.', 'Solvent vapour'),
  ('91000000-0000-4000-8000-000000000001', 2, 'Wear RPE',        'Fit-tested mask, check filters in date.', 'Isocyanates');
