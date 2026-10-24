// Shapes used across the prototype. They mirror the Supabase schema in supabase/migrations,
// flattened where that makes the demo simpler (e.g. parts live inside their estimate item).

export type Sector = 'Residential' | 'Marine' | 'Aviation';
export type Role = 'director' | 'office' | 'workshop' | 'fitter' | 'subcontractor' | 'client';
export type Health = 'ok' | 'chase' | 'risk';

export const STAGES = [
  'Enquiry',
  'Estimating',
  'Quote sent',
  'Approved',
  'Deposit paid',
  'Drawings approved',
  'Samples approved',
  'In production',
  'Delivered',
  'Installed',
  'Final invoice',
] as const;
export type Stage = number; // index into STAGES

export interface Client {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  sector: Sector;
  contact: string;
  email: string;
  since: string;
  rev: number;
}

export interface ProjectEvent {
  id: string;
  at: string; // ISO date-time
  text: string;
  icon: string; // icon key, see components/Icon
  who?: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  sector: Sector;
  value: number; // contract or quoted value ex VAT
  stage: Stage;
  pm: string;
  due: string;
  updated: string;
  health: Health;
  contract: 'supply_only' | 'supply_and_fit';
  nda?: boolean;
  codename?: string;
  brief?: string;
  events: ProjectEvent[];
  documents: { name: string; kind: string; rev?: string; at: string }[];
  estimateId?: string;
  /** Quoted vs actual margin, once the job is live. */
  actualMargin?: number;
}

export type PriceUnit = 'sheet' | 'm' | 'each' | 'pair' | 'm3' | 'm2' | 'sq ft' | 'book' | 'job';

export interface PriceItem {
  sku: string;
  d: string; // description
  sup: string;
  unit: PriceUnit;
  p: number; // price per unit, GBP ex VAT
  src: string;
  dt: string; // date priced
  validUntil?: string;
  cat: string;
  sheet?: [number, number]; // board length x width, mm
  thick?: number;
  history?: { dt: string; p: number; src: string }[];
}

export type Grain = 'L' | 'W' | '-';
export type RateKind = 'workshop' | 'finishing' | 'cad' | 'fit';

export interface Part {
  id: string;
  name: string;
  sku: string;
  // Box in model space, mm. x = width (left/right), y = height, z = depth (front is +z).
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  dir: [number, number, number]; // explode direction
  qty: number;
  grain: Grain;
  edge: number; // edging metres per piece
  finish: boolean; // counted in finished area
  conf: number; // extraction confidence, 0-100
  checked?: boolean; // a person has confirmed it against the drawing
  note?: string;
}

export interface Extra {
  id: string;
  sku: string;
  qty: number;
  note?: string;
}

export interface Operation {
  id: string;
  name: string;
  hours: number;
  rate: RateKind;
}

export interface Subcontract {
  id: string;
  trade: string;
  desc: string;
  supplier: string;
  lo: number;
  hi: number;
  firm?: number;
  status: 'range' | 'requested' | 'firm';
}

export type DesignKind = 'cabinet' | 'table' | 'bookcase';

export interface DesignSpec {
  kind: DesignKind;
  W: number;
  H: number;
  D: number;
  bays: number;
  doors: boolean;
  shelves: number; // per bay
  plinth: number; // 0 = none / legs
  carcass: string; // sku
  back: string;
  plinthSku: string;
  brassEdge: boolean;
  handle: string | null;
  legSku?: string;
}

export interface EstimateItem {
  id: string;
  name: string;
  desc: string; // client-facing description
  qty: number;
  design?: DesignSpec;
  finishSku?: string; // finishing rate per m2, defaults to LAC-PU
  edgeSku?: string; // edging stock, defaults to EDG-WAL-2
  parts: Part[];
  extras: Extra[];
  ops: Operation[];
  subs: Subcontract[];
  drawing?: { file: string; rev: string; extracted: string };
}

export interface Signature {
  name: string;
  position: string;
  dataUrl: string;
  at: string;
  ip: string;
  ua: string;
}

export interface Estimate {
  id: string;
  projectId: string;
  rev: number;
  margin: number; // % of price
  overheadPct: number;
  overheadBase: 'labour' | 'all';
  wastePct: number; // solid timber and linear stock allowance
  items: EstimateItem[];
  status: 'draft' | 'sent' | 'approved';
  sentAt?: string;
  approvedAt?: string;
  signature?: Signature;
  leadWeeks: number;
  validDays: number;
  schedule: { label: string; pct: number }[];
  token: string; // client portal secret
}

export interface Invoice {
  ref: string;
  proj: string;
  client: string;
  amt: number;
  due: string;
  status: 'Draft' | 'Sent' | 'Overdue' | 'Paid';
  label?: string;
}

export interface Bill {
  sup: string;
  ref: string;
  amt: number;
  due: string;
  proj: string;
}

export interface Chase {
  id: string;
  proj: string;
  what: string;
  sent: string;
  n: number;
  next: string;
  tpl: string;
  auto: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  dept: string;
  start: string;
  salary: number;
  lastRise: string;
  risePct: number;
  col: string;
  holiday: { used: number; total: number };
  rtw: string;
  training: Record<string, 'y' | 's' | 'n'>;
  certs: { n: string; exp: string }[];
  health: { n: string; due: string }[];
}

export interface ComplianceCheck {
  id: string;
  n: string;
  basis: string;
  freq: string;
  last: string;
  next: string;
  owner: string;
  cat: string;
}

export interface Mail {
  id: string;
  from: string;
  org: string | null;
  subj: string;
  dt: string;
  att: string;
  proj: string | null;
  unread: boolean;
  supplier?: boolean;
  body: string;
}

export interface Template {
  n: string;
  b: string;
}

export interface Sop {
  n: string;
  owner: string;
  steps: string[];
}

export interface Rates {
  workshop: number;
  finishing: number;
  cad: number;
  fit: number;
}
