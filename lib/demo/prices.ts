import type { PriceItem, Rates } from '../types';

// Demo prices. No UK timber merchant has a public price API, so the real price book is filled
// from supplier quotes, invoices and Xero bills, each price carrying its source and date.
export const PRICES: PriceItem[] = [
  { sku: 'MDF-18-MR', d: 'MDF moisture resistant 18mm, 2440 x 1220', sup: 'James Latham', unit: 'sheet', p: 38.4, src: 'Invoice 14 Sep 2026', dt: '2026-09-14', cat: 'Board', sheet: [2440, 1220], thick: 18 },
  { sku: 'MDF-WAL-19', d: 'Crown-cut American walnut veneered MDF 19mm, 2440 x 1220, 2 sides', sup: 'James Latham', unit: 'sheet', p: 186.0, src: 'Quote 448219, 02 Oct 2026', dt: '2026-10-02', validUntil: '2026-11-01', cat: 'Board', sheet: [2440, 1220], thick: 19, history: [{ dt: '2026-03-11', p: 171.5, src: 'Invoice' }, { dt: '2026-06-20', p: 178.0, src: 'Invoice' }] },
  { sku: 'MDF-OAK-19', d: 'Quarter-cut European oak veneered MDF 19mm, 2440 x 1220', sup: 'James Latham', unit: 'sheet', p: 168.0, src: 'Invoice 21 Sep 2026', dt: '2026-09-21', cat: 'Board', sheet: [2440, 1220], thick: 19 },
  { sku: 'MDF-WAL-9', d: 'Walnut veneered MDF 9mm, 2440 x 1220, 1 side', sup: 'James Latham', unit: 'sheet', p: 118.0, src: 'Quote 448219, 02 Oct 2026', dt: '2026-10-02', validUntil: '2026-11-01', cat: 'Board', sheet: [2440, 1220], thick: 9 },
  { sku: 'MDF-OAK-9', d: 'Oak veneered MDF 9mm, 2440 x 1220, 1 side', sup: 'James Latham', unit: 'sheet', p: 106.5, src: 'Invoice 21 Sep 2026', dt: '2026-09-21', cat: 'Board', sheet: [2440, 1220], thick: 9 },
  { sku: 'PLY-BIR-18', d: 'Birch plywood BB/BB 18mm, 2500 x 1250', sup: 'Morgan Timber', unit: 'sheet', p: 96.8, src: 'Invoice 03 Aug 2026', dt: '2026-08-03', cat: 'Board', sheet: [2500, 1250], thick: 18 },
  { sku: 'HNY-AL-12', d: 'Aluminium honeycomb panel 12mm, figured anigre veneer, 2500 x 1250', sup: 'Aero panel supplier', unit: 'sheet', p: 412.0, src: 'Quote AP-2207, 28 Aug 2026', dt: '2026-08-28', cat: 'Board', sheet: [2500, 1250], thick: 12 },
  { sku: 'HNY-AL-6', d: 'Aluminium honeycomb panel 6mm, balancer veneer, 2500 x 1250', sup: 'Aero panel supplier', unit: 'sheet', p: 268.0, src: 'Quote AP-2207, 28 Aug 2026', dt: '2026-08-28', cat: 'Board', sheet: [2500, 1250], thick: 6 },
  { sku: 'WAL-SOL-27', d: 'American black walnut FAS 27mm', sup: 'Timbmet', unit: 'm3', p: 3480, src: 'Invoice 11 May 2026', dt: '2026-05-11', cat: 'Solid timber' },
  { sku: 'OAK-SOL-27', d: 'European oak QS prime 27mm', sup: 'Timbmet', unit: 'm3', p: 2950, src: 'Invoice 11 May 2026', dt: '2026-05-11', cat: 'Solid timber' },
  { sku: 'EDG-WAL-2', d: 'Walnut edging 2mm x 22mm', sup: 'James Latham', unit: 'm', p: 1.35, src: 'Invoice 14 Sep 2026', dt: '2026-09-14', cat: 'Edging' },
  { sku: 'EDG-OAK-2', d: 'Oak edging 2mm x 22mm', sup: 'James Latham', unit: 'm', p: 1.2, src: 'Invoice 14 Sep 2026', dt: '2026-09-14', cat: 'Edging' },
  { sku: 'EDG-ANI-1', d: 'Anigre veneer edge band 1mm, pre-glued', sup: 'Aero panel supplier', unit: 'm', p: 2.9, src: 'Quote AP-2207, 28 Aug 2026', dt: '2026-08-28', cat: 'Edging' },
  { sku: 'BRS-FLAT-20', d: 'CZ121 brass flat bar 20 x 3mm', sup: 'Metals4U', unit: 'm', p: 21.6, src: 'Web price 08 Oct 2026', dt: '2026-10-08', cat: 'Metal' },
  { sku: 'BLM-CLIP-110', d: 'Blum Clip top Blumotion hinge 110', sup: 'Häfele', unit: 'each', p: 6.42, src: 'Invoice 29 Sep 2026', dt: '2026-09-29', cat: 'Hardware' },
  { sku: 'BLM-MOV-500', d: 'Blum Movento runner set 500mm', sup: 'Häfele', unit: 'pair', p: 58.9, src: 'Invoice 29 Sep 2026', dt: '2026-09-29', cat: 'Hardware' },
  { sku: 'HDL-BRS-160', d: 'Solid brass bar handle 160mm', sup: 'Specialist foundry', unit: 'each', p: 74.0, src: 'Quote 18 Jul 2026', dt: '2026-07-18', cat: 'Hardware' },
  { sku: 'LCH-PUSH', d: 'Push-button positive latch, flush, satin nickel', sup: 'Häfele', unit: 'each', p: 46.5, src: 'Invoice 29 Sep 2026', dt: '2026-09-29', cat: 'Hardware' },
  { sku: 'ISO-MNT', d: 'Anti-vibration isolator mount, M6', sup: 'Aero panel supplier', unit: 'each', p: 38.0, src: 'Quote AP-2207, 28 Aug 2026', dt: '2026-08-28', cat: 'Hardware' },
  { sku: 'LTH-HIDE', d: 'Full-grain aniline leather hide', sup: 'Specialist tannery', unit: 'sq ft', p: 14.2, src: 'Invoice 09 Oct 2026', dt: '2026-10-09', cat: 'Leather', history: [{ dt: '2026-04-22', p: 12.8, src: 'Quote, used in QT-2043' }] },
  { sku: 'GLD-235', d: '23.5ct gold leaf, book of 25', sup: 'Gilding supplier', unit: 'book', p: 52.0, src: 'Invoice 03 Mar 2026', dt: '2026-03-03', cat: 'Gilding' },
  { sku: 'STN-CAL-20', d: 'Calacatta marble 20mm, fabricated', sup: 'Stone partner', unit: 'm2', p: 890, src: 'Quote 12 Aug 2026', dt: '2026-08-12', cat: 'Stone' },
  { sku: 'LAC-PU', d: 'PU lacquer system, satin, per m2 finished', sup: 'In-house rate', unit: 'm2', p: 48.0, src: 'Rate card, reviewed 1 Oct 2026', dt: '2026-10-01', cat: 'Finishing' },
  { sku: 'LAC-FR', d: 'Fire-retardant lacquer system to CS 25.853, per m2 finished', sup: 'In-house rate', unit: 'm2', p: 96.0, src: 'Rate card, reviewed 1 Oct 2026', dt: '2026-10-01', cat: 'Finishing' },
  { sku: 'LAC-MAR', d: '2K marine lacquer, high build, per m2 finished', sup: 'In-house rate', unit: 'm2', p: 72.0, src: 'Rate card, reviewed 1 Oct 2026', dt: '2026-10-01', cat: 'Finishing' },
];

export const RATES: Rates = { workshop: 42, finishing: 46, cad: 55, fit: 48 };
export const OVERHEAD_PCT = 35;
