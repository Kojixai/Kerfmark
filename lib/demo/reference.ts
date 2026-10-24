// Reference data that rarely changes: company, clients, people, compliance, templates, procedures.
// Every client, person and figure is invented except Brackenbury's own company details.

import type { Client, ComplianceCheck, Sop, Staff, Template } from '../types';

export const ORG = {
  name: 'Brackenbury Home Ltd',
  no: '11383054',
  addr: 'Beacon Farm Buildings, Oxenwood, Marlborough, Wiltshire SN8 3NQ',
  email: 'info@brackenburyhome.com',
  tel: '+44 (0)1980 621666',
};

export const CLIENTS: Client[] = [
  { id: 'C01', name: 'Ashcombe Hale Interiors', type: 'Interior designer', city: 'London, Chelsea', country: 'UK', lat: 51.487, lon: -0.168, sector: 'Residential', contact: 'Imogen Ashcombe', email: 'imogen@ashcombehale.example', since: '2021', rev: 612400 },
  { id: 'C02', name: 'Studio Verrier', type: 'Interior designer', city: 'Paris', country: 'France', lat: 48.86, lon: 2.35, sector: 'Residential', contact: 'Lucien Verrier', email: 'lucien@studioverrier.example', since: '2023', rev: 184200 },
  { id: 'C03', name: 'Kestrel Yacht Design', type: 'Yacht studio', city: 'Southampton', country: 'UK', lat: 50.9, lon: -1.4, sector: 'Marine', contact: 'Rory Penhallow', email: 'rory@kestrelyd.example', since: '2022', rev: 298000 },
  { id: 'C04', name: 'Cantiere Ravelle', type: 'Shipyard', city: 'Viareggio', country: 'Italy', lat: 43.87, lon: 10.25, sector: 'Marine', contact: 'Giulia Marchetti', email: 'g.marchetti@ravelle.example', since: '2024', rev: 412750 },
  { id: 'C05', name: 'Albion Family Office', type: 'Family office', city: 'Geneva', country: 'Switzerland', lat: 46.2, lon: 6.14, sector: 'Residential', contact: 'Henrik Sand', email: 'hs@albionfo.example', since: '2022', rev: 356900 },
  { id: 'C06', name: 'Northmere Completions', type: 'Completion centre', city: 'Basel', country: 'Switzerland', lat: 47.56, lon: 7.59, sector: 'Aviation', contact: 'Anja Keller', email: 'a.keller@northmere.example', since: '2025', rev: 238900 },
  { id: 'C07', name: 'Fenwick Lowe Architects', type: 'Architect', city: 'Cirencester', country: 'UK', lat: 51.72, lon: -1.97, sector: 'Residential', contact: 'Tobias Fenwick', email: 'tobias@fenwicklowe.example', since: '2020', rev: 147300 },
  { id: 'C08', name: 'Qasr Interiors', type: 'Interior designer', city: 'Dubai', country: 'UAE', lat: 25.2, lon: 55.27, sector: 'Residential', contact: 'Layla Haddad', email: 'layla@qasr.example', since: '2024', rev: 154200 },
  { id: 'C09', name: 'Halberd Developments', type: 'Developer', city: 'London, Mayfair', country: 'UK', lat: 51.511, lon: -0.149, sector: 'Residential', contact: 'Marcus Hale', email: 'm.hale@halberd.example', since: '2023', rev: 221600 },
  { id: 'C10', name: 'Private client (NDA)', type: 'Private client', city: 'Gstaad', country: 'Switzerland', lat: 46.47, lon: 7.28, sector: 'Residential', contact: 'Via family office', email: 'n/a', since: '2025', rev: 88400 },
];

export const STAFF: Staff[] = [
  { id: 'S1', name: 'Harriet Cole', role: 'Studio and project manager', dept: 'Office', start: '2019-03-04', salary: 52000, lastRise: '2026-04-01', risePct: 4.5, col: '#2f5d50', holiday: { used: 17, total: 28 }, rtw: '2019-02-20', training: {}, certs: [{ n: 'First Aid at Work', exp: '2027-05-14' }, { n: 'IOSH Managing Safely', exp: '2028-01-10' }], health: [] },
  { id: 'S2', name: 'Megan Hart', role: 'Project manager', dept: 'Office', start: '2022-09-12', salary: 46500, lastRise: '2026-04-01', risePct: 3.8, col: '#7a4b2a', holiday: { used: 12, total: 28 }, rtw: '2022-08-30', training: {}, certs: [{ n: 'CSCS (Manager)', exp: '2027-08-01' }, { n: 'SMSTS', exp: '2026-11-18' }], health: [] },
  { id: 'S3', name: 'Daniel Okafor', role: 'Lead cabinetmaker', dept: 'Workshop', start: '2018-07-02', salary: 44800, lastRise: '2025-04-01', risePct: 5, col: '#2457a6', holiday: { used: 21, total: 28 }, rtw: '2018-06-21', training: { 'Panel saw': 'y', 'Spindle moulder': 'y', Bandsaw: 'y', 'CNC router': 'y', Edgebander: 'y', 'Planer thicknesser': 'y' }, certs: [{ n: 'First Aid at Work', exp: '2026-11-02' }, { n: 'Abrasive wheels', exp: '2028-03-01' }, { n: 'Forklift (counterbalance)', exp: '2027-02-19' }], health: [{ n: 'Wood dust spirometry', due: '2027-01-12' }, { n: 'Hearing check', due: '2027-01-12' }] },
  { id: 'S4', name: 'Ellis Marsh', role: 'Cabinetmaker', dept: 'Workshop', start: '2021-01-11', salary: 37200, lastRise: '2026-04-01', risePct: 4, col: '#5b5f97', holiday: { used: 9, total: 28 }, rtw: '2020-12-18', training: { 'Panel saw': 'y', 'Spindle moulder': 's', Bandsaw: 'y', 'CNC router': 'n', Edgebander: 'y', 'Planer thicknesser': 'y' }, certs: [{ n: 'Abrasive wheels', exp: '2026-12-09' }], health: [{ n: 'Wood dust spirometry', due: '2026-10-14' }, { n: 'Hearing check', due: '2027-01-12' }] },
  { id: 'S5', name: 'Priya Nair', role: 'Designer and CAD', dept: 'Office', start: '2023-05-15', salary: 41000, lastRise: '2026-04-01', risePct: 3.5, col: '#9a3f5b', holiday: { used: 14, total: 28 }, rtw: '2023-05-02', training: {}, certs: [], health: [] },
  { id: 'S6', name: 'Sam Whitlock', role: 'Finisher and polisher', dept: 'Workshop', start: '2020-02-03', salary: 35600, lastRise: '2025-10-01', risePct: 3, col: '#6d6a2e', holiday: { used: 19, total: 28 }, rtw: '2020-01-22', training: { 'Panel saw': 'n', 'Spindle moulder': 'n', Bandsaw: 'y', 'CNC router': 'n', Edgebander: 'n', 'Planer thicknesser': 'n' }, certs: [{ n: 'Spray booth and isocyanates', exp: '2027-06-30' }], health: [{ n: 'Wood dust spirometry', due: '2027-02-03' }, { n: 'Isocyanate surveillance', due: '2026-11-03' }] },
  { id: 'S7', name: 'Joe Brannigan', role: 'Fitter and installer', dept: 'Site', start: '2022-03-21', salary: 38900, lastRise: '2026-04-01', risePct: 4, col: '#1f7a4d', holiday: { used: 23, total: 28 }, rtw: '2022-03-10', training: { 'Panel saw': 'y', 'Spindle moulder': 'n', Bandsaw: 'y', 'CNC router': 'n', Edgebander: 'n', 'Planer thicknesser': 'y' }, certs: [{ n: 'CSCS (Skilled worker)', exp: '2027-09-30' }, { n: 'PASMA towers', exp: '2026-11-27' }, { n: 'IPAF 3a/3b', exp: '2028-04-14' }, { n: 'SSSTS', exp: '2029-02-01' }], health: [{ n: 'Hearing check', due: '2027-03-21' }] },
];

export const MACHINES = ['Panel saw', 'Spindle moulder', 'Bandsaw', 'CNC router', 'Edgebander', 'Planer thicknesser'];

export const COMPLIANCE: ComplianceCheck[] = [
  { n: 'Fire alarm call-point test', basis: 'BS 5839-1', freq: 'Weekly', last: '2026-10-16', next: '2026-10-23', owner: 'Harriet Cole', cat: 'Fire' },
  { n: 'Emergency lighting flick test', basis: 'BS 5266-1', freq: 'Monthly', last: '2026-09-25', next: '2026-10-25', owner: 'Harriet Cole', cat: 'Fire' },
  { n: 'Emergency lighting 3-hour test', basis: 'BS 5266-1', freq: 'Annual', last: '2025-11-08', next: '2026-11-08', owner: 'Contractor', cat: 'Fire' },
  { n: 'Fire extinguisher service', basis: 'BS 5306-3', freq: 'Annual', last: '2025-10-12', next: '2026-10-12', owner: 'Contractor', cat: 'Fire' },
  { n: 'Fire risk assessment review', basis: 'Fire Safety Order 2005', freq: 'Annual', last: '2026-02-03', next: '2027-02-03', owner: 'Harriet Cole', cat: 'Fire' },
  { n: 'LEV dust extraction thorough test', basis: 'COSHH reg 9, HSG258', freq: '14 months', last: '2025-09-30', next: '2026-11-30', owner: 'Contractor', cat: 'Workshop' },
  { n: 'Wood dust air monitoring', basis: 'EH40 WEL 3 mg/m3 hardwood', freq: 'Annual', last: '2026-01-20', next: '2027-01-20', owner: 'Contractor', cat: 'Workshop' },
  { n: 'Noise assessment', basis: 'Noise at Work Regs 2005', freq: 'On change, review 2 years', last: '2025-03-11', next: '2027-03-11', owner: 'Harriet Cole', cat: 'Workshop' },
  { n: 'Woodworking machinery inspection', basis: 'PUWER 1998, L114', freq: '6 months', last: '2026-05-02', next: '2026-11-02', owner: 'Daniel Okafor', cat: 'Workshop' },
  { n: 'Forklift thorough examination', basis: 'LOLER 1998', freq: '12 months', last: '2025-12-01', next: '2026-12-01', owner: 'Contractor', cat: 'Workshop' },
  { n: 'Lifting slings and straps', basis: 'LOLER 1998', freq: '6 months', last: '2026-04-28', next: '2026-10-28', owner: 'Daniel Okafor', cat: 'Workshop' },
  { n: 'Fixed wiring EICR', basis: 'Electricity at Work Regs, BS 7671', freq: '5 years', last: '2022-06-14', next: '2027-06-14', owner: 'Contractor', cat: 'Electrical' },
  { n: 'PAT, site power tools', basis: 'Electricity at Work Regs', freq: '3 months', last: '2026-07-08', next: '2026-10-08', owner: 'Joe Brannigan', cat: 'Electrical' },
  { n: 'Spray booth DSEAR review', basis: 'DSEAR 2002', freq: 'Annual', last: '2026-03-15', next: '2027-03-15', owner: 'Sam Whitlock', cat: 'Workshop' },
  { n: 'Employers liability insurance', basis: 'ELCI Act 1969', freq: 'Annual', last: '2026-01-01', next: '2027-01-01', owner: 'Harriet Cole', cat: 'Insurance' },
  { n: 'Asbestos register re-inspection', basis: 'CAR 2012 reg 4', freq: 'Annual', last: '2025-11-20', next: '2026-11-20', owner: 'Contractor', cat: 'Building' },
].map((c, i) => ({ ...c, id: 'K' + (i + 1) }));

export const TEMPLATES: Template[] = [
  { n: 'Quote follow-up 1', b: 'Dear {{first_name}},\n\nI hope you are well. I wanted to check you had everything you need on our quotation {{quote_ref}} for the {{project_title}}.\n\nYou can view and approve it here: {{portal_link}}\n\nHappy to talk it through whenever suits.\n\nKind regards,\n{{sender}}\nBrackenbury Home' },
  { n: 'Quote follow-up 2', b: 'Dear {{first_name}},\n\nA gentle follow-up on quotation {{quote_ref}}. Our current lead time for the {{project_title}} is {{lead_time}}, and we can hold that slot until {{hold_date}}.\n\nView the quote: {{portal_link}}\n\nKind regards,\n{{sender}}' },
  { n: 'Sample approval reminder', b: 'Dear {{first_name}},\n\nThe samples for {{project_title}} are ready for your sign-off in the portal: {{portal_link}}\n\nProduction is scheduled to start on {{start_date}}, so approval by {{approve_by}} keeps us on programme.\n\nKind regards,\n{{sender}}' },
  { n: 'Payment reminder (polite)', b: 'Dear {{first_name}},\n\nOur records show invoice {{invoice_ref}} for {{amount}} was due on {{due_date}}. If it is already on its way, thank you, please ignore this note.\n\nPayment details and a copy of the invoice: {{portal_link}}\n\nKind regards,\n{{sender}}' },
  { n: 'Quote', b: 'Dear {{first_name}},\n\nThank you for asking us to price the {{project_title}}. Our quotation {{quote_ref}} is ready for you here: {{portal_link}}\n\nYou can review the drawing, the payment schedule and approve online. Our current lead time is {{lead_time}} from drawing approval.\n\nKind regards,\n{{sender}}\nBrackenbury Home' },
];

export const SOPS: Sop[] = [
  { n: 'New enquiry to quote', owner: 'Harriet Cole', steps: ['Log the enquiry and link the sender to a client record', 'Upload drawings and run extraction', 'Check every extracted dimension against the drawing (red rows first)', 'Match materials to the price book; refresh any price older than 90 days', 'Request subcontract prices for specialist crafts', 'Set margin and review with a director', 'Send the quote through the client portal'] },
  { n: 'Drawing approval', owner: 'Priya Nair', steps: ['Issue workshop drawings as revision A', 'Send for approval through the portal', 'Log comments against the revision', 'Re-issue until approved, then lock the revision'] },
  { n: 'Goods in and inspection', owner: 'Daniel Okafor', steps: ['Check delivery note against the purchase order', 'Inspect for damage and veneer match', 'Photograph and attach to the PO', 'Book into stock against the job'] },
  { n: 'Site installation', owner: 'Joe Brannigan', steps: ['Confirm RAMS signed for the site', 'Check site access and protection', 'Install and photograph each piece', 'Snag list with the client or designer', 'Client sign-off in the app'] },
  { n: 'Yacht furniture documentation pack', owner: 'Megan Hart', steps: ['Collect IMO FTP Code test certificates per material and finish combination', 'Record foam and fabric batch numbers', 'Record weight per piece', 'Issue the pack to the yard with the delivery'] },
  { n: 'Aircraft interior parts pack', owner: 'Megan Hart', steps: ['Confirm the completion centre’s weight budget per monument', 'Send veneer and finish build-ups for 25.853 burn testing before production', 'Weigh every finished piece and record it against the budget', 'Issue certificates of conformity with the delivery'] },
];

export const MONEY = {
  bank: 1066946,
  months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  in: [142, 96, 188, 121, 205, 164, 231, 176, 149, 212, 188, 97],
  out: [118, 131, 126, 140, 152, 139, 168, 149, 131, 158, 147, 88],
};

export const ROLES: { id: import('../types').Role; label: string; who: string }[] = [
  { id: 'director', label: 'Director', who: 'Full access' },
  { id: 'office', label: 'Office', who: 'Harriet Cole' },
  { id: 'workshop', label: 'Workshop', who: 'Daniel Okafor' },
  { id: 'fitter', label: 'Fitter', who: 'Joe Brannigan' },
  { id: 'client', label: 'Client', who: 'Imogen Ashcombe' },
];
