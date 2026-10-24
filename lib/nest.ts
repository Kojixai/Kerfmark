// Sheet nesting with MaxRects (best short side fit).
// Grain rules: 'L' means the grain runs along the part's length, which must sit along the
// sheet length; 'W' means it runs across the part, so the part is turned 90 degrees;
// '-' (no grain, e.g. MR MDF) may go either way, whichever fits better.

import type { Grain } from './types';

export interface NestInput {
  id: string;
  name: string;
  L: number; // part length, mm
  W: number; // part width, mm
  grain: Grain;
}

export interface Placed extends NestInput {
  x: number; // along sheet length
  y: number; // across sheet width
  pl: number; // placed extent along sheet length
  pw: number; // placed extent across sheet width
  rotated: boolean;
}

export interface Sheet {
  pcs: Placed[];
  used: number; // mm2 of parts
}

export interface NestResult {
  sheets: Sheet[];
  sheetL: number;
  sheetW: number;
  yield: number; // 0-1, part area over sheet area across all sheets
  unplaced: NestInput[]; // bigger than a sheet
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (a: Rect, b: Rect) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;

class Bin {
  free: Rect[];
  pcs: Placed[] = [];
  used = 0;
  constructor(w: number, h: number) {
    this.free = [{ x: 0, y: 0, w, h }];
  }

  /** Best placement for a w x h footprint, or null. Lower score is better. */
  find(w: number, h: number): { r: Rect; score: number } | null {
    let best: { r: Rect; score: number } | null = null;
    for (const f of this.free) {
      if (w <= f.w && h <= f.h) {
        const score = Math.min(f.w - w, f.h - h);
        if (!best || score < best.score) best = { r: { x: f.x, y: f.y, w, h }, score };
      }
    }
    return best;
  }

  place(r: Rect) {
    const next: Rect[] = [];
    for (const f of this.free) {
      if (!overlaps(f, r)) {
        next.push(f);
        continue;
      }
      if (r.x > f.x) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
      if (r.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
    }
    this.free = next.filter((a, i) => !next.some((b, j) => j !== i && contains(b, a) && (!contains(a, b) || j < i)));
  }
}

/**
 * Nest parts onto sheets of sheetL x sheetW. Each part is grown by the kerf so saw cuts
 * are allowed for, and a trim margin is kept clear round the sheet edge.
 */
export function nest(parts: NestInput[], sheetL = 2440, sheetW = 1220, kerf = 4, trim = 10): NestResult {
  const UL = sheetL - 2 * trim + kerf;
  const UW = sheetW - 2 * trim + kerf;
  const items = [...parts].sort((a, b) => b.L * b.W - a.L * a.W || b.L - a.L);
  const bins: Bin[] = [];
  const unplaced: NestInput[] = [];

  const orientations = (it: NestInput): { l: number; w: number; rotated: boolean }[] => {
    const normal = { l: it.L + kerf, w: it.W + kerf, rotated: false };
    const turned = { l: it.W + kerf, w: it.L + kerf, rotated: true };
    if (it.grain === 'L') return [normal];
    if (it.grain === 'W') return [turned];
    return [normal, turned];
  };

  for (const it of items) {
    const opts = orientations(it);
    if (!opts.some((o) => o.l <= UL && o.w <= UW)) {
      unplaced.push(it);
      continue;
    }
    let done = false;
    for (const bin of bins) {
      let best: { r: Rect; score: number; o: (typeof opts)[number] } | null = null;
      for (const o of opts) {
        const f = bin.find(o.l, o.w);
        if (f && (!best || f.score < best.score)) best = { ...f, o };
      }
      if (best) {
        bin.place(best.r);
        bin.pcs.push({ ...it, x: best.r.x + trim, y: best.r.y + trim, pl: best.o.l - kerf, pw: best.o.w - kerf, rotated: best.o.rotated });
        bin.used += it.L * it.W;
        done = true;
        break;
      }
    }
    if (!done) {
      const bin = new Bin(UL, UW);
      const o = opts.find((o) => o.l <= UL && o.w <= UW)!;
      const r = { x: 0, y: 0, w: o.l, h: o.w };
      bin.place(r);
      bin.pcs.push({ ...it, x: trim, y: trim, pl: o.l - kerf, pw: o.w - kerf, rotated: o.rotated });
      bin.used += it.L * it.W;
      bins.push(bin);
    }
  }

  const sheets = bins.map((b) => ({ pcs: b.pcs, used: b.used }));
  const used = sheets.reduce((a, s) => a + s.used, 0);
  return { sheets, sheetL, sheetW, yield: sheets.length ? used / (sheets.length * sheetL * sheetW) : 0, unplaced };
}
