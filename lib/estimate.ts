// The costing engine. Pure functions: an estimate plus the price book and labour rates in,
// costed lines, sheet layouts, totals and the "check before sending" list out.

import { nest, type NestResult } from './nest';
import { days } from './format';
import type { Estimate, EstimateItem, Grain, Part, PriceItem, Rates, RateKind } from './types';

export type LineGroup = 'Materials' | 'Finishing' | 'Labour' | 'Subcontract';

export interface Line {
  group: LineGroup;
  desc: string;
  qty: number;
  unit: string;
  rate: number;
  cost: number;
  sku?: string;
}

export interface SheetUse {
  sku: string;
  desc: string;
  result: NestResult;
}

export interface ItemCost {
  itemId: string;
  lines: Line[];
  nests: SheetUse[];
  mat: number;
  fin: number;
  labour: number;
  over: number;
  sub: number;
  cost: number;
  price: number;
  area: number;
  hours: number;
}

export interface Check {
  level: 'red' | 'amber' | 'blue';
  tag: string;
  text: string;
  itemId?: string;
  partId?: string;
  sku?: string;
  subId?: string;
}

export interface EstimateCost {
  items: ItemCost[];
  mat: number;
  fin: number;
  labour: number;
  over: number;
  sub: number;
  cost: number;
  price: number;
  profit: number;
  hours: number;
  checks: Check[];
}

export const DEFAULT_FINISH = 'LAC-PU';
export const DEFAULT_EDGE = 'EDG-WAL-2';
/** Usable fraction of sawn hardwood after defecting, ripping and planing. */
export const SOLID_YIELD = 0.6;
export const PRICE_STALE_DAYS = 90;

export const RATE_LABEL: Record<RateKind, string> = {
  workshop: 'Workshop',
  finishing: 'Finishing',
  cad: 'CAD and drawing',
  fit: 'Fitting',
};

/** Cutting sizes for a part: length, width, thickness, largest first. */
export function cutDims(p: Pick<Part, 'w' | 'h' | 'd'>): [number, number, number] {
  const s = [p.w, p.h, p.d].sort((a, b) => b - a);
  return [s[0], s[1], s[2]];
}

/** Which model axis carries each cutting dimension, so an edit to "length" moves the right face. */
export function axisFor(p: Pick<Part, 'w' | 'h' | 'd'>, which: 0 | 1 | 2): 'w' | 'h' | 'd' {
  const axes: ('w' | 'h' | 'd')[] = ['w', 'h', 'd'];
  const order = [...axes].sort((a, b) => p[b] - p[a]);
  return order[which];
}

const isSheet = (pi?: PriceItem) => pi?.unit === 'sheet';

function priceMap(prices: PriceItem[]) {
  return new Map(prices.map((p) => [p.sku, p]));
}

export function costItem(
  item: EstimateItem,
  est: Pick<Estimate, 'overheadPct' | 'overheadBase' | 'wastePct' | 'margin'>,
  prices: PriceItem[],
  rates: Rates,
): ItemCost {
  const P = priceMap(prices);
  const lines: Line[] = [];
  const nests: SheetUse[] = [];
  const mult = Math.max(1, item.qty);

  // Sheet goods: nest every piece of every part, per board type.
  const bySheet = new Map<string, { id: string; name: string; L: number; W: number; grain: Grain }[]>();
  // Everything else: total up by sku and unit.
  const byOther = new Map<string, number>();

  for (const part of item.parts) {
    const pi = P.get(part.sku);
    const [L, W, T] = cutDims(part);
    const n = part.qty * mult;
    if (isSheet(pi)) {
      const arr = bySheet.get(part.sku) ?? [];
      for (let i = 0; i < n; i++) arr.push({ id: part.id + '#' + i, name: part.name, L, W, grain: part.grain });
      bySheet.set(part.sku, arr);
      continue;
    }
    if (!pi) continue;
    let q = 0;
    const waste = 1 + est.wastePct / 100;
    switch (pi.unit) {
      case 'm':
        q = (L / 1000) * n * waste;
        break;
      case 'm3':
        q = ((L * W * T) / 1e9 / SOLID_YIELD) * n;
        break;
      case 'm2':
        q = ((L * W) / 1e6) * n;
        break;
      case 'sq ft':
        q = ((L * W) / 1e6) * 10.764 * n * waste;
        break;
      default:
        q = n;
    }
    byOther.set(part.sku, (byOther.get(part.sku) ?? 0) + q);
  }

  let mat = 0;
  for (const [sku, pcs] of bySheet) {
    const pi = P.get(sku)!;
    const [sl, sw] = pi.sheet ?? [2440, 1220];
    const result = nest(pcs, sl, sw);
    const sheets = result.sheets.length + result.unplaced.length;
    const cost = sheets * pi.p;
    mat += cost;
    nests.push({ sku, desc: pi.d, result });
    lines.push({ group: 'Materials', desc: pi.d, qty: sheets, unit: 'sheet', rate: pi.p, cost, sku });
  }
  for (const [sku, q] of byOther) {
    const pi = P.get(sku)!;
    const qty = pi.unit === 'each' || pi.unit === 'pair' || pi.unit === 'book' ? Math.ceil(q) : +q.toFixed(2);
    const cost = qty * pi.p;
    mat += cost;
    lines.push({ group: 'Materials', desc: pi.d, qty, unit: pi.unit, rate: pi.p, cost, sku });
  }

  const edgeM = item.parts.reduce((a, p) => a + p.edge * p.qty * mult, 0);
  const edgePi = P.get(item.edgeSku ?? DEFAULT_EDGE);
  if (edgeM > 0 && edgePi) {
    const qty = +(edgeM * (1 + est.wastePct / 100)).toFixed(1);
    mat += qty * edgePi.p;
    lines.push({ group: 'Materials', desc: edgePi.d, qty, unit: 'm', rate: edgePi.p, cost: qty * edgePi.p, sku: edgePi.sku });
  }

  for (const ex of item.extras) {
    const pi = P.get(ex.sku);
    if (!pi) continue;
    const qty = ex.qty * mult;
    mat += qty * pi.p;
    lines.push({ group: 'Materials', desc: pi.d + (ex.note ? ` (${ex.note})` : ''), qty, unit: pi.unit, rate: pi.p, cost: qty * pi.p, sku: pi.sku });
  }

  const area = item.parts
    .filter((p) => p.finish)
    .reduce((a, p) => {
      const [L, W] = cutDims(p);
      return a + ((L * W) / 1e6) * 2 * p.qty * mult;
    }, 0);
  let fin = 0;
  const finPi = P.get(item.finishSku ?? DEFAULT_FINISH);
  if (area > 0 && finPi) {
    const qty = +area.toFixed(1);
    fin = qty * finPi.p;
    lines.push({ group: 'Finishing', desc: finPi.d + ', both faces', qty, unit: 'm2', rate: finPi.p, cost: fin, sku: finPi.sku });
  }

  let labour = 0;
  let hours = 0;
  for (const op of item.ops) {
    const h = op.hours * mult;
    const rate = rates[op.rate];
    labour += h * rate;
    hours += h;
    lines.push({ group: 'Labour', desc: op.name, qty: h, unit: 'hrs', rate, cost: h * rate });
  }

  let sub = 0;
  for (const s of item.subs) {
    const each = s.firm ?? (s.lo + s.hi) / 2;
    const c = each * mult;
    sub += c;
    const how = s.firm != null ? `firm price, ${s.supplier}` : `range £${s.lo.toLocaleString('en-GB')} to £${s.hi.toLocaleString('en-GB')}, midpoint used`;
    lines.push({ group: 'Subcontract', desc: `${s.trade}: ${s.desc} (${how})`, qty: mult, unit: 'job', rate: each, cost: c });
  }

  const over = (est.overheadBase === 'labour' ? labour : mat + fin + labour + sub) * (est.overheadPct / 100);
  const cost = mat + fin + labour + over + sub;
  const price = cost / (1 - est.margin / 100);
  return { itemId: item.id, lines, nests, mat, fin, labour, over, sub, cost, price, area, hours };
}

export function costEstimate(est: Estimate, prices: PriceItem[], rates: Rates): EstimateCost {
  const items = est.items.map((it) => costItem(it, est, prices, rates));
  const sum = (k: keyof Pick<ItemCost, 'mat' | 'fin' | 'labour' | 'over' | 'sub' | 'cost' | 'price' | 'hours'>) =>
    items.reduce((a, i) => a + i[k], 0);
  const cost = sum('cost');
  const price = sum('price');
  return {
    items,
    mat: sum('mat'),
    fin: sum('fin'),
    labour: sum('labour'),
    over: sum('over'),
    sub: sum('sub'),
    cost,
    price,
    profit: price - cost,
    hours: sum('hours'),
    checks: checksFor(est, items, prices),
  };
}

export function checksFor(est: Estimate, costs: ItemCost[], prices: PriceItem[]): Check[] {
  const P = priceMap(prices);
  const out: Check[] = [];
  const used = new Set<string>();

  for (const item of est.items) {
    for (const p of item.parts) {
      used.add(p.sku);
      if (!P.has(p.sku)) out.push({ level: 'red', tag: 'No price', text: `${item.name}: ${p.name} uses ${p.sku}, which is not in the price book`, itemId: item.id, partId: p.id });
      if (p.conf < 80 && !p.checked)
        out.push({ level: 'amber', tag: `${p.conf}%`, text: `${item.name}: ${p.name}. ${p.note ?? 'Low confidence read from the drawing'}`, itemId: item.id, partId: p.id });
    }
    for (const e of item.extras) used.add(e.sku);
    if (item.parts.some((p) => p.finish)) used.add(item.finishSku ?? DEFAULT_FINISH);
    if (item.parts.some((p) => p.edge > 0)) used.add(item.edgeSku ?? DEFAULT_EDGE);
    for (const s of item.subs)
      if (s.firm == null)
        out.push({
          level: 'blue',
          tag: s.status === 'requested' ? 'Price requested' : 'Subcontract',
          text: `${s.trade} for ${item.name.toLowerCase()} is a range. ${s.status === 'requested' ? `Waiting on ${s.supplier}` : `Request a firm price from ${s.supplier}`}`,
          itemId: item.id,
          subId: s.id,
        });
  }
  for (const c of costs)
    for (const n of c.nests)
      for (const u of n.result.unplaced)
        out.push({ level: 'red', tag: 'Too big', text: `${u.name} (${Math.round(u.L)} x ${Math.round(u.W)}) does not fit a ${n.result.sheetL} x ${n.result.sheetW} sheet. Join it or use a jumbo board`, itemId: c.itemId });

  for (const sku of used) {
    const pi = P.get(sku);
    if (!pi) continue;
    if (pi.validUntil && days(pi.validUntil) <= 14)
      out.push({
        level: 'amber',
        tag: days(pi.validUntil) < 0 ? 'Expired' : 'Price expiry',
        text: `${pi.d.split(',')[0]} from ${pi.sup} ${days(pi.validUntil) < 0 ? 'expired' : 'expires'} ${new Date(pi.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Order or requote`,
        sku,
      });
    else if (-days(pi.dt) > PRICE_STALE_DAYS)
      out.push({ level: 'amber', tag: 'Price age', text: `${pi.d.split(',')[0]} was last priced ${-days(pi.dt)} days ago (${pi.src}). Ask ${pi.sup} to requote`, sku });
  }
  const rank = { red: 0, amber: 1, blue: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Client-facing quote lines: one per item, rounded to £10, with the total kept consistent. */
export function quoteLines(est: Estimate, cost: EstimateCost) {
  const lines = est.items.map((it, i) => ({ id: it.id, name: it.name, desc: it.desc, qty: it.qty, price: Math.round(cost.items[i].price / 10) * 10 }));
  const total = lines.reduce((a, l) => a + l.price, 0);
  return { lines, total };
}
