// Parametric furniture: turn a handful of dimensions into a full cutting list with model
// positions, so the estimate, sheet layouts and 3D view all come from the same parts.
// Coordinates are millimetres, origin on the floor at the centre, y up, front of the piece +z.

import type { DesignSpec, Grain, Part, PriceItem } from './types';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

type Add = (
  name: string,
  sku: string,
  size: [number, number, number],
  pos: [number, number, number],
  opts: { grain?: Grain; edge?: number; finish?: boolean; dir?: [number, number, number] },
) => void;

function collector() {
  const parts: Part[] = [];
  const add: Add = (name, sku, [w, h, d], [x, y, z], o) =>
    parts.push({
      id: slug(name),
      name,
      sku,
      w: Math.round(w),
      h: Math.round(h),
      d: Math.round(d),
      x,
      y,
      z,
      dir: o.dir ?? [0, 0, 0],
      qty: 1,
      grain: o.grain ?? 'L',
      edge: +(o.edge ?? 0).toFixed(2),
      finish: o.finish ?? false,
      conf: 100,
      checked: true,
    });
  return { parts, add };
}

export function thicknessOf(sku: string, prices: PriceItem[], fallback = 19) {
  return prices.find((p) => p.sku === sku)?.thick ?? fallback;
}

export function generateParts(spec: DesignSpec, prices: PriceItem[]): Part[] {
  if (spec.kind === 'table') return table(spec, prices);
  return cabinet(spec, prices);
}

function cabinet(s: DesignSpec, prices: PriceItem[]): Part[] {
  const { parts, add } = collector();
  const T = thicknessOf(s.carcass, prices);
  const BT = thicknessOf(s.back, prices, 9);
  const PL = s.plinth;
  const W = s.W,
    H = s.H,
    D = s.D;
  const CW = W - 2 * T; // carcass sits in from the top's overhang
  const ID = CW - 2 * T;
  const bays = Math.max(1, Math.round(s.bays));
  const bay = (ID - (bays - 1) * T) / bays;
  const IH = H - PL - 2 * T;
  const CD = D - 20; // carcass depth behind the top's front overhang
  const cz = -10; // carcass centre in depth
  const front = cz + CD / 2;
  const fin = { finish: true };

  add('Top', s.carcass, [W, T, D], [0, H - T / 2, 0], { ...fin, grain: 'L', edge: (W + 2 * D) / 1000, dir: [0, 1, 0] });
  add('Base', s.carcass, [ID, T, CD], [0, PL + T / 2, cz], { ...fin, grain: 'L', edge: ID / 1000, dir: [0, -1, 0] });
  for (const side of [-1, 1] as const)
    add(`End panel ${side < 0 ? 'left' : 'right'}`, s.carcass, [T, H - T - PL, CD], [side * (CW / 2 - T / 2), PL + (H - T - PL) / 2, cz], {
      ...fin,
      grain: 'L',
      edge: ((H - T - PL) * 2) / 1000 + CD / 1000,
      dir: [side, 0, 0],
    });
  for (let i = 1; i < bays; i++) {
    const x = -ID / 2 + i * bay + (i - 1) * T + T / 2;
    add(`Division ${i}`, s.carcass, [T, IH, CD - 20], [x, PL + T + IH / 2, cz - 10], { ...fin, grain: 'L', edge: IH / 1000, dir: [0, 0, -0.4] });
  }
  add('Back', s.back, [ID, IH, BT], [0, PL + T + IH / 2, cz - CD / 2 + BT / 2], { grain: 'L', dir: [0, 0, -1] });

  const shelves = Math.max(0, Math.round(s.shelves));
  for (let b = 0; b < bays; b++) {
    const x = -ID / 2 + bay / 2 + b * (bay + T);
    for (let n = 1; n <= shelves; n++) {
      const y = PL + T + (IH * n) / (shelves + 1);
      const name = shelves > 1 ? `Shelf ${b + 1}.${n}` : `Shelf ${b + 1}`;
      add(name, s.carcass, [bay - 4, T, CD - 60], [x, y, cz - 15], { ...fin, grain: 'L', edge: (bay - 4) / 1000, dir: [0, 0, -0.3] });
    }
  }

  if (s.doors) {
    for (let b = 0; b < bays; b++) {
      const x = -ID / 2 + bay / 2 + b * (bay + T);
      const dw = bay + T - 3;
      const dh = IH - 2;
      add(`Door ${b + 1}`, s.carcass, [dw, dh, T], [x, PL + T + IH / 2, front + T / 2], {
        ...fin,
        grain: 'L',
        edge: ((dw + dh) * 2) / 1000,
        dir: [0, 0, 1],
      });
      if (s.handle) {
        const side = b % 2 ? -1 : 1;
        add(`Handle ${b + 1}`, s.handle, [12, 160, 22], [x + side * (dw / 2 - 60), PL + T + IH / 2 + 120, front + T + 11], { grain: '-', dir: [0, 0, 1.6] });
      }
    }
  }

  if (PL > 0) {
    const PT = thicknessOf(s.plinthSku, prices, 18);
    const pw = W - 120;
    const pd = CD - 98;
    add('Plinth front', s.plinthSku, [pw, PL, PT], [0, PL / 2, cz + pd / 2 + PT / 2], { grain: '-', dir: [0, -1, 1] });
    add('Plinth back', s.plinthSku, [pw, PL, PT], [0, PL / 2, cz - pd / 2 - PT / 2], { grain: '-', dir: [0, -1, -1] });
    for (const side of [-1, 1] as const)
      add(`Plinth side ${side < 0 ? 'left' : 'right'}`, s.plinthSku, [PT, PL, pd], [side * (pw / 2 - PT / 2), PL / 2, cz], { grain: '-', dir: [side, -1, 0] });
  }

  if (s.brassEdge) add('Brass top edge', 'BRS-FLAT-20', [W, 20, 3], [0, H - T / 2, D / 2 + 1.5], { grain: '-', dir: [0, 0.5, 1] });
  return parts;
}

function table(s: DesignSpec, prices: PriceItem[]): Part[] {
  const { parts, add } = collector();
  const T = thicknessOf(s.carcass, prices, 19);
  const top = Math.max(T, 38); // tops are built up to look substantial
  const leg = 80;
  const inset = 90;
  const legH = s.H - top;
  const legSku = s.legSku ?? 'WAL-SOL-27';
  const lx = s.W / 2 - inset - leg / 2;
  const lz = s.D / 2 - inset - leg / 2;
  add('Top', s.carcass, [s.W, T, s.D], [0, s.H - T / 2, 0], { finish: true, grain: 'L', edge: (2 * (s.W + s.D)) / 1000, dir: [0, 1, 0] });
  if (top > T)
    add('Top build-up', s.plinthSku, [s.W - 60, top - T, s.D - 60], [0, s.H - T - (top - T) / 2, 0], { grain: '-', dir: [0, 0.6, 0] });
  const legs: [string, number, number][] = [
    ['Leg front left', -lx, lz],
    ['Leg front right', lx, lz],
    ['Leg back left', -lx, -lz],
    ['Leg back right', lx, -lz],
  ];
  for (const [n, x, z] of legs) add(n, legSku, [leg, legH, leg], [x, legH / 2, z], { finish: true, grain: 'L', dir: [Math.sign(x), -0.4, Math.sign(z)] });
  const ah = 100;
  const at = 22;
  const ay = legH - ah / 2;
  add('Apron front', legSku, [2 * lx - leg, ah, at], [0, ay, lz], { finish: true, grain: 'L', dir: [0, -0.2, 1] });
  add('Apron back', legSku, [2 * lx - leg, ah, at], [0, ay, -lz], { finish: true, grain: 'L', dir: [0, -0.2, -1] });
  add('Apron left', legSku, [at, ah, 2 * lz - leg], [-lx, ay, 0], { finish: true, grain: 'L', dir: [-1, -0.2, 0] });
  add('Apron right', legSku, [at, ah, 2 * lz - leg], [lx, ay, 0], { finish: true, grain: 'L', dir: [1, -0.2, 0] });
  if (s.brassEdge) {
    add('Brass edge front', 'BRS-FLAT-20', [s.W, 20, 3], [0, s.H - T / 2, s.D / 2 + 1.5], { grain: '-', dir: [0, 0.5, 1] });
    add('Brass edge back', 'BRS-FLAT-20', [s.W, 20, 3], [0, s.H - T / 2, -s.D / 2 - 1.5], { grain: '-', dir: [0, 0.5, -1] });
  }
  return parts;
}

/** Default hinges and runners for a generated design, so new estimates start complete. */
export function defaultExtras(spec: DesignSpec) {
  const out: { sku: string; qty: number; note?: string }[] = [];
  if (spec.kind !== 'table' && spec.doors) {
    const perDoor = spec.H - spec.plinth > 900 ? 3 : 2;
    out.push({ sku: 'BLM-CLIP-110', qty: Math.round(spec.bays) * perDoor, note: `${perDoor} per door` });
  }
  return out;
}

/** Starting labour for a generated design, scaled from the sideboard Brackenbury already priced. */
export function defaultOps(spec: DesignSpec, partCount: number) {
  const sizeF = Math.max(0.5, (spec.W * spec.H) / (2400 * 820));
  const r = (v: number) => Math.max(1, Math.round(v));
  const ops: { name: string; hours: number; rate: 'cad' | 'workshop' | 'finishing' | 'fit' }[] = [
    { name: 'CAD and workshop drawings', hours: r(8 + partCount * 0.3), rate: 'cad' },
    { name: 'Machining and edging', hours: r(partCount * 1.1), rate: 'workshop' },
    { name: spec.kind === 'table' ? 'Jointing and assembly' : 'Veneer matching and assembly', hours: r(40 * sizeF + partCount), rate: 'workshop' },
    { name: 'Finishing', hours: r(24 * sizeF + partCount * 0.6), rate: 'finishing' },
  ];
  if (spec.brassEdge) ops.push({ name: 'Brass fitting', hours: 10, rate: 'workshop' });
  ops.push({ name: 'Packing and delivery', hours: r(6 * sizeF), rate: 'workshop' });
  return ops;
}
