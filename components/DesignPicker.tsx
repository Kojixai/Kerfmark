'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import { useStore } from '@/lib/store';
import type { DesignKind, DesignSpec } from '@/lib/types';

export const PRESETS: Record<'sideboard' | 'bookcase' | 'table' | 'labour', { label: string; icon: string; hint: string; spec: DesignSpec | null }> = {
  sideboard: {
    label: 'Cabinet or sideboard',
    icon: 'cube',
    hint: 'Carcass, divisions, shelves, doors, plinth',
    spec: { kind: 'cabinet', W: 1800, H: 820, D: 500, bays: 3, doors: true, shelves: 1, plinth: 80, carcass: 'MDF-WAL-19', back: 'MDF-WAL-9', plinthSku: 'MDF-18-MR', brassEdge: false, handle: 'HDL-BRS-160' },
  },
  bookcase: {
    label: 'Bookcase or library run',
    icon: 'book-open',
    hint: 'Tall open carcass with adjustable shelves',
    spec: { kind: 'bookcase', W: 2000, H: 2400, D: 360, bays: 3, doors: false, shelves: 5, plinth: 90, carcass: 'MDF-OAK-19', back: 'MDF-OAK-9', plinthSku: 'MDF-18-MR', brassEdge: false, handle: null },
  },
  table: {
    label: 'Table',
    icon: 'squares-four',
    hint: 'Veneered top, solid legs and aprons',
    spec: { kind: 'table', W: 2200, H: 750, D: 1000, bays: 1, doors: false, shelves: 0, plinth: 0, carcass: 'MDF-WAL-19', back: 'MDF-WAL-9', plinthSku: 'PLY-BIR-18', brassEdge: false, handle: null, legSku: 'WAL-SOL-27' },
  },
  labour: { label: 'Labour and subcontract only', icon: 'hammer', hint: 'Upholstery, gilding, installation, shipping', spec: null },
};

export type PresetKey = keyof typeof PRESETS;

/** Choose a starting design and its main dimensions. Returns a spec (or null for labour-only) and a name. */
export function DesignPicker({ onDone, cta = 'Add item', defaultName = '' }: { onDone: (spec: DesignSpec | null, name: string) => void; cta?: string; defaultName?: string }) {
  const prices = useStore((s) => s.prices);
  const [key, setKey] = useState<PresetKey>('sideboard');
  const [spec, setSpec] = useState<DesignSpec | null>(PRESETS.sideboard.spec);
  const [name, setName] = useState(defaultName);
  const boards = prices.filter((p) => p.unit === 'sheet' && (p.thick ?? 0) >= 12);

  const pick = (k: PresetKey) => {
    setKey(k);
    setSpec(PRESETS[k].spec ? { ...PRESETS[k].spec! } : null);
  };
  const set = (patch: Partial<DesignSpec>) => setSpec((s) => (s ? { ...s, ...patch } : s));

  return (
    <div className="stack">
      <div className="grid g2" style={{ gap: 8 }}>
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <button key={k} className={`itemtab ${key === k ? 'on' : ''}`} onClick={() => pick(k)} style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name={PRESETS[k].icon} s />
              <span className="n">{PRESETS[k].label}</span>
            </div>
            <div className="v" style={{ fontFamily: 'var(--sans)', marginTop: 4 }}>
              {PRESETS[k].hint}
            </div>
          </button>
        ))}
      </div>
      <div className="field">
        <label>Item name</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={PRESETS[key].label} />
      </div>
      {spec && (
        <>
          <div className="param">
            {(['W', 'H', 'D'] as const).map((k) => (
              <div className="field" key={k}>
                <label>{{ W: 'Width', H: 'Height', D: 'Depth' }[k]} mm</label>
                <input className="inp num" type="number" value={spec[k]} onChange={(e) => set({ [k]: +e.target.value } as Partial<DesignSpec>)} />
              </div>
            ))}
            {spec.kind !== 'table' && (
              <>
                <div className="field">
                  <label>Bays</label>
                  <input className="inp num" type="number" min={1} max={8} value={spec.bays} onChange={(e) => set({ bays: +e.target.value })} />
                </div>
                <div className="field">
                  <label>Shelves per bay</label>
                  <input className="inp num" type="number" min={0} max={8} value={spec.shelves} onChange={(e) => set({ shelves: +e.target.value })} />
                </div>
              </>
            )}
          </div>
          <div className="field">
            <label>Main board</label>
            <select className="inp" value={spec.carcass} onChange={(e) => set({ carcass: e.target.value })}>
              {boards.map((b) => (
                <option key={b.sku} value={b.sku}>
                  {b.d.split(',')[0]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <button className="btn dark" onClick={() => onDone(spec ? { ...spec, kind: spec.kind as DesignKind } : null, name.trim() || PRESETS[key].label)}>
        <Icon name="plus" s />
        {cta}
      </button>
    </div>
  );
}
