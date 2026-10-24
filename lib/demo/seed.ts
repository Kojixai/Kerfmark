// The demo world: projects, three fully worked estimates, invoices, bills, chases and mail.
// buildSeed() is run once on first load (and on "Reset demo"); after that the store owns it.

import { costEstimate, quoteLines } from '../estimate';
import { defaultExtras, generateParts } from '../parametric';
import type { Bill, Chase, DesignSpec, Estimate, EstimateItem, Invoice, Mail, Part, Project } from '../types';
import { PRICES, RATES, OVERHEAD_PCT } from './prices';

let n = 0;
const id = (p: string) => `${p}${++n}`;

const SCHEDULE = [
  { label: 'Deposit on approval', pct: 50 },
  { label: 'Before delivery', pct: 40 },
  { label: 'After installation', pct: 10 },
];

function designed(spec: DesignSpec, conf: Record<string, [number, string?]> = {}): Part[] {
  return generateParts(spec, PRICES).map((p) => {
    const c = conf[p.id];
    return c ? { ...p, conf: c[0], checked: c[0] >= 80, note: c[1] } : p;
  });
}

// ---------------- P-2051: walnut and brass sideboard, being estimated from a PDF ----------------

const SB_SPEC: DesignSpec = {
  kind: 'cabinet',
  W: 2400,
  H: 820,
  D: 520,
  bays: 4,
  doors: true,
  shelves: 1,
  plinth: 80,
  carcass: 'MDF-WAL-19',
  back: 'MDF-WAL-9',
  plinthSku: 'MDF-18-MR',
  brassEdge: true,
  handle: 'HDL-BRS-160',
};

const sideboard: EstimateItem = {
  id: 'I-2051-1',
  name: 'Sideboard SB-01',
  desc: 'Sideboard 2400 x 520 x 820mm in crown-cut American walnut veneer, book-matched doors, satin lacquer, solid brass top edge and four cast brass bar handles',
  qty: 1,
  design: SB_SPEC,
  drawing: { file: 'AH-SB-01_rev2.pdf', rev: '2', extracted: '2026-10-20T09:16:00' },
  parts: designed(SB_SPEC, {
    top: [98],
    base: [97],
    'end-panel-left': [93],
    'end-panel-right': [93],
    'division-1': [88],
    'division-2': [88],
    'division-3': [88],
    back: [71, 'Back thickness not dimensioned; assumed 9mm walnut veneered MDF'],
    'handle-1': [64, 'Handle position read from a note, not a dimension'],
    'handle-2': [64, 'Handle position read from a note, not a dimension'],
    'handle-3': [64, 'Handle position read from a note, not a dimension'],
    'handle-4': [64, 'Handle position read from a note, not a dimension'],
    'shelf-1': [90],
    'shelf-2': [90],
    'shelf-3': [90],
    'shelf-4': [90],
  }),
  extras: [{ id: 'X1', ...defaultExtras(SB_SPEC)[0] }],
  ops: [
    { id: 'O1', name: 'CAD and workshop drawings', hours: 16, rate: 'cad' },
    { id: 'O2', name: 'Machining and edging', hours: 28, rate: 'workshop' },
    { id: 'O3', name: 'Veneer matching and assembly', hours: 72, rate: 'workshop' },
    { id: 'O4', name: 'Finishing', hours: 40, rate: 'finishing' },
    { id: 'O5', name: 'Brass fitting', hours: 10, rate: 'workshop' },
    { id: 'O6', name: 'Packing and delivery', hours: 8, rate: 'workshop' },
    { id: 'O7', name: 'Installation, Chelsea', hours: 8, rate: 'fit' },
  ],
  subs: [{ id: 'U1', trade: 'Metalwork', desc: 'Brass edge fabrication, mitred corners and polishing', supplier: 'Alder Metalcraft', lo: 1650, hi: 2100, status: 'range' }],
};

const E2051: Estimate = {
  id: 'E-2051',
  projectId: 'P-2051',
  rev: 1,
  margin: 40,
  overheadPct: OVERHEAD_PCT,
  overheadBase: 'labour',
  wastePct: 15,
  items: [sideboard],
  status: 'draft',
  leadWeeks: 14,
  validDays: 30,
  schedule: SCHEDULE,
  token: 'q7d2k9sb',
};

// ---------------- P-2045: ACJ320 cabin furniture, approved, drawings signed off ----------------

const CR_SPEC: DesignSpec = {
  kind: 'cabinet',
  W: 1800,
  H: 700,
  D: 480,
  bays: 3,
  doors: true,
  shelves: 1,
  plinth: 0,
  carcass: 'HNY-AL-12',
  back: 'HNY-AL-6',
  plinthSku: 'HNY-AL-6',
  brassEdge: false,
  handle: null,
};
const ST_SPEC: DesignSpec = {
  kind: 'table',
  W: 600,
  H: 560,
  D: 600,
  bays: 1,
  doors: false,
  shelves: 0,
  plinth: 0,
  carcass: 'HNY-AL-12',
  back: 'HNY-AL-6',
  plinthSku: 'HNY-AL-6',
  brassEdge: false,
  handle: null,
  legSku: 'WAL-SOL-27',
};

const E2045: Estimate = {
  id: 'E-2045',
  projectId: 'P-2045',
  rev: 3,
  margin: 34,
  overheadPct: OVERHEAD_PCT,
  overheadBase: 'labour',
  wastePct: 15,
  status: 'approved',
  sentAt: '2026-07-21T10:12:00',
  approvedAt: '2026-08-04T15:40:00',
  signature: { name: 'Anja Keller', position: 'Head of Interiors', dataUrl: '', at: '2026-08-04T15:40:00', ip: '185.12.64.20', ua: 'Safari 17, macOS' },
  leadWeeks: 22,
  validDays: 30,
  schedule: [
    { label: 'Deposit on approval', pct: 40 },
    { label: 'On drawing approval', pct: 30 },
    { label: 'On delivery to Basel', pct: 30 },
  ],
  token: 'n4x8cr45',
  items: [
    {
      id: 'I-2045-1',
      name: 'Cabin credenza CR-01',
      desc: 'Credenza 1800 x 480 x 700mm on aluminium honeycomb core, figured anigre veneer, fire-retardant satin finish to CS 25.853, positive push latches, isolator mounts',
      qty: 1,
      design: CR_SPEC,
      finishSku: 'LAC-FR',
      edgeSku: 'EDG-ANI-1',
      drawing: { file: 'NMC-ACJ-CR01_revC.pdf', rev: 'C', extracted: '2026-07-14T11:02:00' },
      parts: designed(CR_SPEC),
      extras: [
        { id: 'X1', sku: 'LCH-PUSH', qty: 3, note: 'one per door' },
        { id: 'X2', sku: 'BLM-CLIP-110', qty: 6 },
        { id: 'X3', sku: 'ISO-MNT', qty: 6 },
      ],
      ops: [
        { id: 'O1', name: 'CAD, weight and balance drawings', hours: 60, rate: 'cad' },
        { id: 'O2', name: 'Certification documents and conformity', hours: 36, rate: 'cad' },
        { id: 'O3', name: 'Machining honeycomb and edge banding', hours: 48, rate: 'workshop' },
        { id: 'O4', name: 'Veneer matching and assembly', hours: 110, rate: 'workshop' },
        { id: 'O5', name: 'Fire-retardant finishing', hours: 70, rate: 'finishing' },
        { id: 'O6', name: 'Weighing, crating and delivery to Basel', hours: 16, rate: 'workshop' },
        { id: 'O7', name: 'Installation support at completion centre', hours: 24, rate: 'fit' },
      ],
      subs: [
        { id: 'U1', trade: 'Testing', desc: 'CS 25.853 vertical burn tests, 3 build-ups', supplier: 'Aero test lab', lo: 2800, hi: 3400, firm: 3150, status: 'firm' },
        { id: 'U2', trade: 'Metalwork', desc: 'Machined aluminium mounting rails, anodised', supplier: 'Alder Metalcraft', lo: 1800, hi: 2400, firm: 2240, status: 'firm' },
      ],
    },
    {
      id: 'I-2045-2',
      name: 'Club seat side tables',
      desc: 'Pair of side tables 600 x 600 x 560mm, honeycomb top in figured anigre, solid walnut legs and aprons, fire-retardant finish, floor track fixings',
      qty: 2,
      design: ST_SPEC,
      finishSku: 'LAC-FR',
      edgeSku: 'EDG-ANI-1',
      parts: designed(ST_SPEC),
      extras: [{ id: 'X1', sku: 'ISO-MNT', qty: 4 }],
      ops: [
        { id: 'O1', name: 'CAD and weight drawings', hours: 14, rate: 'cad' },
        { id: 'O2', name: 'Machining and jointing', hours: 22, rate: 'workshop' },
        { id: 'O3', name: 'Assembly and fitting', hours: 18, rate: 'workshop' },
        { id: 'O4', name: 'Fire-retardant finishing', hours: 16, rate: 'finishing' },
      ],
      subs: [{ id: 'U1', trade: 'Metalwork', desc: 'Seat-track floor fittings, machined and anodised', supplier: 'Alder Metalcraft', lo: 900, hi: 1300, firm: 1180, status: 'firm' }],
    },
  ],
};

// ---------------- P-2043: saloon furniture for a 62m motor yacht, samples approved ----------------

const YS_SPEC: DesignSpec = {
  kind: 'cabinet',
  W: 2400,
  H: 900,
  D: 550,
  bays: 4,
  doors: true,
  shelves: 1,
  plinth: 60,
  carcass: 'MDF-OAK-19',
  back: 'MDF-OAK-9',
  plinthSku: 'PLY-BIR-18',
  brassEdge: false,
  handle: 'HDL-BRS-160',
};
const CT_SPEC: DesignSpec = {
  kind: 'table',
  W: 1600,
  H: 420,
  D: 900,
  bays: 1,
  doors: false,
  shelves: 0,
  plinth: 0,
  carcass: 'MDF-OAK-19',
  back: 'MDF-OAK-9',
  plinthSku: 'PLY-BIR-18',
  brassEdge: true,
  handle: null,
  legSku: 'OAK-SOL-27',
};

const E2043: Estimate = {
  id: 'E-2043',
  projectId: 'P-2043',
  rev: 2,
  margin: 30,
  overheadPct: OVERHEAD_PCT,
  overheadBase: 'labour',
  wastePct: 15,
  status: 'approved',
  sentAt: '2026-05-06T09:30:00',
  approvedAt: '2026-05-19T17:05:00',
  signature: { name: 'Giulia Marchetti', position: 'Interior project manager', dataUrl: '', at: '2026-05-19T17:05:00', ip: '93.41.211.7', ua: 'Chrome 124, Windows' },
  leadWeeks: 26,
  validDays: 30,
  schedule: [
    { label: 'Deposit on approval', pct: 30 },
    { label: 'On sample approval', pct: 30 },
    { label: 'Before shipping', pct: 30 },
    { label: 'On installation aboard', pct: 10 },
  ],
  token: 'm8v3yt62',
  items: [
    {
      id: 'I-2043-1',
      name: 'Saloon sideboard',
      desc: 'Sideboard 2400 x 550 x 900mm in quarter-cut oak veneer, 2K marine lacquer, positive latches, brass bar handles, through-bolted to the deck',
      qty: 1,
      design: YS_SPEC,
      finishSku: 'LAC-MAR',
      edgeSku: 'EDG-OAK-2',
      drawing: { file: 'RAV-62-SAL-SB_revD.pdf', rev: 'D', extracted: '2026-04-28T14:20:00' },
      parts: designed(YS_SPEC),
      extras: [
        { id: 'X1', sku: 'BLM-CLIP-110', qty: 8 },
        { id: 'X2', sku: 'LCH-PUSH', qty: 4, note: 'sea-going doors' },
      ],
      ops: [
        { id: 'O1', name: 'CAD and yard coordination', hours: 30, rate: 'cad' },
        { id: 'O2', name: 'Machining and edging', hours: 36, rate: 'workshop' },
        { id: 'O3', name: 'Veneer matching and assembly', hours: 96, rate: 'workshop' },
        { id: 'O4', name: 'Marine finishing', hours: 56, rate: 'finishing' },
      ],
      subs: [{ id: 'U1', trade: 'Stone', desc: 'Calacatta top 2400 x 550, templated and fabricated', supplier: 'Stone partner', lo: 3600, hi: 4400, firm: 4120, status: 'firm' }],
    },
    {
      id: 'I-2043-2',
      name: 'Saloon coffee table',
      desc: 'Coffee table 1600 x 900 x 420mm, oak veneer top with brass edge, solid oak legs, marine lacquer, deck fixings',
      qty: 1,
      design: CT_SPEC,
      finishSku: 'LAC-MAR',
      edgeSku: 'EDG-OAK-2',
      parts: designed(CT_SPEC),
      extras: [],
      ops: [
        { id: 'O1', name: 'CAD', hours: 8, rate: 'cad' },
        { id: 'O2', name: 'Machining and jointing', hours: 20, rate: 'workshop' },
        { id: 'O3', name: 'Assembly and brass fitting', hours: 22, rate: 'workshop' },
        { id: 'O4', name: 'Marine finishing', hours: 18, rate: 'finishing' },
      ],
      subs: [{ id: 'U1', trade: 'Metalwork', desc: 'Brass edge fabrication and polishing', supplier: 'Alder Metalcraft', lo: 1400, hi: 1800, firm: 1640, status: 'firm' }],
    },
    {
      id: 'I-2043-3',
      name: 'Saloon sofas',
      desc: 'Pair of 3.2m saloon sofas, hardwood frames, CMHR foam to IMO FTP Code Part 8, full-grain aniline leather',
      qty: 2,
      parts: [],
      extras: [{ id: 'X1', sku: 'LTH-HIDE', qty: 210, note: 'sq ft per sofa, leather supplied to the upholsterer' }],
      ops: [
        { id: 'O1', name: 'CAD, frame templates and sample coordination', hours: 18, rate: 'cad' },
        { id: 'O2', name: 'Plinths and fixing rails', hours: 16, rate: 'workshop' },
      ],
      subs: [{ id: 'U1', trade: 'Upholstery', desc: 'Frame, foam and upholstery, FTP Code foam certificates', supplier: 'Pellow Upholstery', lo: 16000, hi: 19500, firm: 18200, status: 'firm' }],
    },
    {
      id: 'I-2043-4',
      name: 'Shipping and installation aboard',
      desc: 'Crating, freight to Viareggio, and installation aboard by two Brackenbury fitters',
      qty: 1,
      parts: [],
      extras: [],
      ops: [
        { id: 'O1', name: 'Crating', hours: 24, rate: 'workshop' },
        { id: 'O2', name: 'Installation aboard, 2 fitters x 4 days', hours: 64, rate: 'fit' },
      ],
      subs: [
        { id: 'U1', trade: 'Freight', desc: 'Road freight Wiltshire to Viareggio, tail-lift', supplier: 'Euro freight forwarder', lo: 2800, hi: 3600, firm: 3250, status: 'firm' },
        { id: 'U2', trade: 'Travel', desc: 'Fitters travel and accommodation, 4 nights', supplier: 'Travel', lo: 2200, hi: 2800, firm: 2460, status: 'firm' },
      ],
    },
  ],
};

// ---------------- Projects ----------------

const P = (p: Omit<Project, 'events' | 'documents' | 'contract'> & Partial<Pick<Project, 'events' | 'documents' | 'contract'>>): Project => ({
  contract: 'supply_and_fit',
  events: [],
  documents: [],
  ...p,
});

const ev = (at: string, text: string, icon: string, who?: string) => ({ id: id('ev'), at, text, icon, who });

export function buildSeed() {
  n = 0;
  const estimates = [E2051, E2045, E2043].map((e) => structuredClone(e));

  const projects: Project[] = [
    P({
      id: 'P-2051',
      title: 'Walnut and brass sideboard',
      client: 'C01',
      sector: 'Residential',
      value: 0,
      stage: 1,
      pm: 'Megan Hart',
      due: '2027-02-12',
      updated: '2026-10-20',
      health: 'ok',
      estimateId: 'E-2051',
      brief: 'Drawing room sideboard for a Chelsea house. Walnut with a brass edge, satin finish. Installation February.',
      events: [
        ev('2026-10-20T09:14:00', 'Enquiry received from Imogen Ashcombe with drawing AH-SB-01 rev 2', 'envelope-simple', 'Inbox'),
        ev('2026-10-20T09:16:00', '25 parts extracted from the drawing, 6 flagged for checking', 'ruler', 'Estimator'),
        ev('2026-10-20T11:30:00', 'Estimate started', 'calculator', 'Megan Hart'),
      ],
      documents: [{ name: 'AH-SB-01_rev2.pdf', kind: 'Client drawing', rev: '2', at: '2026-10-20' }],
    }),
    P({ id: 'P-2050', title: 'Kitchen island and pantry', client: 'C07', sector: 'Residential', value: 0, stage: 0, pm: 'Megan Hart', due: '2027-04-30', updated: '2026-10-19', health: 'ok', brief: 'Early sketches only. Island with a stone top and a walk-in pantry, painted.', events: [ev('2026-10-19T13:27:00', 'Enquiry received from Tobias Fenwick with early sketches', 'envelope-simple', 'Inbox')], documents: [{ name: 'FL-KI-sketch.pdf', kind: 'Sketch', at: '2026-10-19' }] }),
    P({ id: 'P-2049', title: 'Pair of gilded consoles', client: 'C05', sector: 'Residential', value: 0, stage: 0, pm: 'Harriet Cole', due: '2027-03-01', updated: '2026-10-18', health: 'ok', contract: 'supply_only', brief: 'Pair of consoles with water-gilded aprons for a Geneva apartment.', events: [ev('2026-10-18T10:05:00', 'Enquiry received by phone from Henrik Sand', 'phone', 'Harriet Cole')] }),
    P({ id: 'P-2048', title: 'Dressing room and island', client: 'C08', sector: 'Residential', value: 154200, stage: 2, pm: 'Harriet Cole', due: '2027-05-20', updated: '2026-10-09', health: 'chase', events: [ev('2026-10-09T16:00:00', 'Quote QT-2048 sent. Revisions requested to the island', 'paper-plane-tilt', 'Harriet Cole')] }),
    P({ id: 'P-2047', title: 'Dining table and 14 chairs', client: 'C02', sector: 'Residential', value: 96300, stage: 2, pm: 'Megan Hart', due: '2027-01-28', updated: '2026-10-02', health: 'chase', events: [ev('2026-10-02T12:00:00', 'Quote QT-2047 sent', 'paper-plane-tilt', 'Megan Hart'), ev('2026-10-09T09:00:00', 'Follow-up 1 sent automatically', 'arrows-clockwise', 'Chaser')] }),
    P({
      id: 'P-2045',
      title: 'Cabin credenza and tables, ACJ320',
      client: 'C06',
      sector: 'Aviation',
      value: 0,
      stage: 5,
      pm: 'Megan Hart',
      due: '2027-03-15',
      updated: '2026-10-17',
      health: 'ok',
      contract: 'supply_only',
      estimateId: 'E-2045',
      actualMargin: 35.2,
      brief: 'Credenza and a pair of side tables for an ACJ320 VIP cabin, delivered to the completion centre in Basel. Weight budget 38kg for the credenza.',
      events: [
        ev('2026-07-08T10:00:00', 'Enquiry from Anja Keller with cabin layout and weight budget', 'envelope-simple', 'Inbox'),
        ev('2026-07-21T10:12:00', 'Quote QT-2045 rev 3 sent', 'paper-plane-tilt', 'Megan Hart'),
        ev('2026-08-04T15:40:00', 'Quote approved and signed in the portal by Anja Keller', 'signature', 'Client portal'),
        ev('2026-08-11T09:00:00', 'Deposit invoice INV-1176 paid (Xero)', 'bank', 'Xero'),
        ev('2026-09-02T09:00:00', 'Burn test samples sent to the test lab', 'flask', 'Megan Hart'),
        ev('2026-10-14T15:20:00', 'Workshop drawings rev C approved', 'files', 'Client portal'),
        ev('2026-10-17T08:51:00', 'Anja Keller asked for burn test reports for the credenza veneer', 'envelope-simple', 'Inbox'),
      ],
      documents: [
        { name: 'QT-2045 rev 3 signed.pdf', kind: 'Signed quote', rev: '3', at: '2026-08-04' },
        { name: 'NMC-ACJ-CR01_revC.pdf', kind: 'Workshop drawings', rev: 'C', at: '2026-10-14' },
        { name: 'Weight budget per monument.xlsx', kind: 'Client document', at: '2026-07-08' },
        { name: '25.853 burn test reports.zip', kind: 'Certification', at: '2026-10-02' },
      ],
    }),
    P({
      id: 'P-2043',
      title: 'Saloon furniture, 62m motor yacht',
      client: 'C04',
      sector: 'Marine',
      value: 0,
      stage: 6,
      pm: 'Harriet Cole',
      due: '2027-06-30',
      updated: '2026-10-14',
      health: 'risk',
      estimateId: 'E-2043',
      actualMargin: 24.1,
      brief: 'Main saloon: sideboard, coffee table and a pair of sofas for a 62m motor yacht in build at Viareggio. Leather cost rose 11% after the quote.',
      events: [
        ev('2026-04-14T10:00:00', 'Enquiry from Giulia Marchetti with saloon GA', 'envelope-simple', 'Inbox'),
        ev('2026-05-06T09:30:00', 'Quote QT-2043 rev 2 sent', 'paper-plane-tilt', 'Harriet Cole'),
        ev('2026-05-19T17:05:00', 'Quote approved and signed in the portal by Giulia Marchetti', 'signature', 'Client portal'),
        ev('2026-05-28T09:00:00', 'Deposit invoice INV-1162 paid (Xero)', 'bank', 'Xero'),
        ev('2026-07-30T11:00:00', 'Workshop drawings rev D approved by the yard', 'files', 'Client portal'),
        ev('2026-10-09T10:00:00', 'Leather price up 11% on supplier invoice ST-3307', 'warning', 'Price book'),
        ev('2026-10-14T16:40:00', 'Oak, lacquer and leather samples approved', 'check-circle', 'Client portal'),
      ],
      documents: [
        { name: 'QT-2043 rev 2 signed.pdf', kind: 'Signed quote', rev: '2', at: '2026-05-19' },
        { name: 'RAV-62-SAL-SB_revD.pdf', kind: 'Workshop drawings', rev: 'D', at: '2026-07-30' },
        { name: 'Sample sign-off.pdf', kind: 'Approval', at: '2026-10-14' },
        { name: 'IMO FTP Part 8 certificates.zip', kind: 'Certification', at: '2026-09-20' },
      ],
    }),
    P({ id: 'P-2041', title: 'Library joinery and partners desk', client: 'C01', sector: 'Residential', value: 186400, stage: 7, pm: 'Megan Hart', due: '2026-12-04', updated: '2026-10-21', health: 'ok', actualMargin: 33.8, events: [ev('2026-09-15T08:00:00', 'Production started, cutting list issued to workshop', 'hammer', 'Daniel Okafor')] }),
    P({ id: 'P-2039', title: 'Bar and display cabinets', client: 'C09', sector: 'Residential', value: 221600, stage: 10, pm: 'Harriet Cole', due: '2026-09-30', updated: '2026-10-11', health: 'ok', actualMargin: 29.4, events: [ev('2026-10-11T12:00:00', 'Final invoice INV-1185 sent', 'receipt', 'Xero')] }),
  ];

  // Contract values for the worked projects come straight from their estimates.
  for (const e of estimates) {
    const pr = projects.find((p) => p.id === e.projectId)!;
    pr.value = quoteLines(e, costEstimate(e, PRICES, RATES)).total;
  }
  const v = (pid: string) => projects.find((p) => p.id === pid)!.value;
  const pct = (pid: string, f: number) => Math.round(v(pid) * f);

  const invoices: Invoice[] = [
    { ref: 'INV-1192', proj: 'P-2041', client: 'C01', amt: 55920, due: '2026-11-04', status: 'Sent', label: 'Stage 2' },
    { ref: 'INV-1188', proj: 'P-2045', client: 'C06', amt: pct('P-2045', 0.3), due: '2026-10-15', status: 'Overdue', label: 'On drawing approval' },
    { ref: 'INV-1185', proj: 'P-2039', client: 'C09', amt: 22160, due: '2026-10-25', status: 'Sent', label: 'Final' },
    { ref: 'INV-1181', proj: 'P-2043', client: 'C04', amt: pct('P-2043', 0.3), due: '2026-10-28', status: 'Sent', label: 'On sample approval' },
    { ref: 'INV-1176', proj: 'P-2045', client: 'C06', amt: pct('P-2045', 0.4), due: '2026-08-11', status: 'Paid', label: 'Deposit' },
    { ref: 'INV-1162', proj: 'P-2043', client: 'C04', amt: pct('P-2043', 0.3), due: '2026-05-28', status: 'Paid', label: 'Deposit' },
  ];

  const bills: Bill[] = [
    { sup: 'James Latham', ref: 'SI-77810', amt: 4318.2, due: '2026-10-31', proj: 'P-2041' },
    { sup: 'Häfele', ref: 'H-224019', amt: 1206.44, due: '2026-10-28', proj: 'P-2041' },
    { sup: 'Stone partner', ref: 'SP-0912', amt: 4120.0, due: '2026-11-12', proj: 'P-2043' },
    { sup: 'Specialist tannery', ref: 'ST-3307', amt: 5964.0, due: '2026-11-05', proj: 'P-2043' },
    { sup: 'Aero panel supplier', ref: 'AP-8812', amt: 2884.0, due: '2026-10-30', proj: 'P-2045' },
    { sup: 'Aero test lab', ref: 'ATL-551', amt: 3150.0, due: '2026-10-20', proj: 'P-2045' },
  ];

  const chases: Chase[] = [
    { id: 'H1', proj: 'P-2047', what: 'Quote sent, no reply', sent: '2026-10-02', n: 2, next: '2026-10-23', tpl: 'Quote follow-up 2', auto: true },
    { id: 'H2', proj: 'P-2048', what: 'Quote sent, revisions requested', sent: '2026-10-09', n: 1, next: '2026-10-22', tpl: 'Quote follow-up 1', auto: true },
    { id: 'H3', proj: 'P-2045', what: `Invoice INV-1188 overdue 6 days`, sent: '2026-10-15', n: 1, next: '2026-10-24', tpl: 'Payment reminder (polite)', auto: true },
    { id: 'H4', proj: 'P-2043', what: 'Sample approval invoice due 28 Oct', sent: '2026-10-14', n: 0, next: '2026-10-29', tpl: 'Payment reminder (polite)', auto: true },
  ];

  const inbox: Mail[] = [
    { id: 'E1', from: 'Imogen Ashcombe', org: 'C01', subj: 'Sideboard for the drawing room, drawings attached', dt: '2026-10-20 09:14', att: 'AH-SB-01_rev2.pdf', proj: 'P-2051', unread: true, body: 'Hi both,\n\nPlease find attached rev 2 of the sideboard for the Chelsea drawing room. Walnut with the brass edge we discussed, satin finish. Could you price it, ideally by the end of next week? Installation would be February.\n\nMany thanks,\nImogen' },
    { id: 'E2', from: 'Giulia Marchetti', org: 'C04', subj: 'RE: Saloon sofa leather samples', dt: '2026-10-19 16:02', att: '', proj: 'P-2043', unread: true, body: 'Ciao Harriet,\n\nThe owner is happy with the cognac hide. Please go ahead. Can you confirm the FTP certificates for the foam will come with the delivery?\n\nGrazie,\nGiulia' },
    { id: 'E5', from: 'Tobias Fenwick', org: 'C07', subj: 'Kitchen island, early sketches', dt: '2026-10-19 13:27', att: 'FL-KI-sketch.pdf', proj: 'P-2050', unread: false, body: 'Morning,\n\nEarly sketches for the island and pantry at the Cirencester barn. Nothing fixed yet, but a ballpark would help the client set a budget.\n\nTobias' },
    { id: 'E4', from: 'Anja Keller', org: 'C06', subj: 'Burn test reports for credenza veneer', dt: '2026-10-17 08:51', att: '', proj: 'P-2045', unread: false, body: 'Dear Megan,\n\nOur certification team needs the 25.853 burn test reports for the anigre build-up before we can book the installation slot. Could you send them over?\n\nBest regards,\nAnja' },
    { id: 'E3', from: 'James Latham', org: null, subj: 'Quotation 448219, veneered MDF', dt: '2026-10-02 11:40', att: 'Q448219.pdf', proj: null, unread: false, supplier: true, body: 'Please find attached our quotation 448219 for veneered MDF as requested. Prices valid until 1 November.' },
  ];

  return { projects, estimates, invoices, bills, chases, inbox };
}
