import { describe, expect, it } from 'vitest';
import { costEstimate, cutDims, axisFor, quoteLines } from './estimate';
import { nest } from './nest';
import { generateParts } from './parametric';
import { buildSeed } from './demo/seed';
import { PRICES, RATES } from './demo/prices';

describe('nest', () => {
  it('places every part inside the sheet without overlaps', () => {
    const parts = Array.from({ length: 30 }, (_, i) => ({ id: 'p' + i, name: 'p' + i, L: 300 + ((i * 137) % 900), W: 120 + ((i * 71) % 400), grain: (i % 3 === 0 ? '-' : 'L') as '-' | 'L' }));
    const r = nest(parts, 2440, 1220, 4, 10);
    expect(r.unplaced).toHaveLength(0);
    expect(r.sheets.reduce((a, s) => a + s.pcs.length, 0)).toBe(30);
    for (const s of r.sheets) {
      for (const p of s.pcs) {
        expect(p.x).toBeGreaterThanOrEqual(10);
        expect(p.y).toBeGreaterThanOrEqual(10);
        expect(p.x + p.pl).toBeLessThanOrEqual(2430);
        expect(p.y + p.pw).toBeLessThanOrEqual(1210);
        if (p.grain === 'L') expect(p.rotated).toBe(false);
      }
      for (let i = 0; i < s.pcs.length; i++)
        for (let j = i + 1; j < s.pcs.length; j++) {
          const a = s.pcs[i], b = s.pcs[j];
          const sep = a.x + a.pl + 4 <= b.x || b.x + b.pl + 4 <= a.x || a.y + a.pw + 4 <= b.y || b.y + b.pw + 4 <= a.y;
          expect(sep, `${a.name} overlaps ${b.name}`).toBe(true);
        }
    }
    expect(r.yield).toBeGreaterThan(0.4);
  });

  it('reports parts too big for the sheet instead of dropping them', () => {
    const r = nest([{ id: 'a', name: 'Long top', L: 3200, W: 550, grain: 'L' }]);
    expect(r.unplaced).toHaveLength(1);
    expect(r.sheets).toHaveLength(0);
  });

  it('turns cross-grain parts', () => {
    const r = nest([{ id: 'a', name: 'Door', L: 700, W: 580, grain: 'W' }]);
    expect(r.sheets[0].pcs[0].rotated).toBe(true);
  });
});

describe('cutting dimensions', () => {
  it('sorts largest first and maps edits back to the right axis', () => {
    const p = { w: 19, h: 700, d: 500 };
    expect(cutDims(p)).toEqual([700, 500, 19]);
    expect(axisFor(p, 0)).toBe('h');
    expect(axisFor(p, 2)).toBe('w');
  });
});

describe('parametric', () => {
  it('builds the sideboard cutting list the drawing describes', () => {
    const seed = buildSeed();
    const spec = seed.estimates[0].items[0].design!;
    const parts = generateParts(spec, PRICES);
    const names = parts.map((p) => p.name);
    expect(names.filter((n) => n.startsWith('Door'))).toHaveLength(4);
    expect(names.filter((n) => n.startsWith('Division'))).toHaveLength(3);
    expect(parts.find((p) => p.name === 'Top')).toMatchObject({ w: 2400, h: 19, d: 520 });
    expect(parts.length).toBe(25);
  });
});

describe('costing', () => {
  const seed = buildSeed();
  for (const e of seed.estimates) {
    it(`${e.id} prices to a margin that matches the slider`, () => {
      const c = costEstimate(e, PRICES, RATES);
      expect(c.price).toBeGreaterThan(c.cost);
      expect(c.profit / c.price).toBeCloseTo(e.margin / 100, 6);
      expect(c.mat + c.fin + c.labour + c.over + c.sub).toBeCloseTo(c.cost, 6);
      const q = quoteLines(e, c);
      expect(Math.abs(q.total - c.price)).toBeLessThan(10 * e.items.length);
      console.log(e.id, Math.round(c.price), 'cost', Math.round(c.cost), 'checks', c.checks.map((x) => x.tag).join(', '));
    });
  }
  it('charges overheads on labour only when the base is labour', () => {
    const e = seed.estimates[0];
    const c = costEstimate(e, PRICES, RATES);
    expect(c.over).toBeCloseTo(c.labour * 0.35, 6);
    const all = costEstimate({ ...e, overheadBase: 'all' }, PRICES, RATES);
    expect(all.over).toBeCloseTo((all.mat + all.fin + all.labour + all.sub) * 0.35, 6);
  });
  it('flags the expiring board price and the unchecked low-confidence parts', () => {
    const c = costEstimate(seed.estimates[0], PRICES, RATES);
    const tags = c.checks.map((x) => x.tag);
    expect(tags).toContain('71%');
    expect(tags).toContain('Subcontract');
    expect(c.checks.some((x) => x.sku === 'MDF-WAL-19')).toBe(true);
  });
});
