'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Drawer, Locked, useCan } from '@/components/ui';
import { useStore } from '@/lib/store';
import { days, dshort, dt, gbp } from '@/lib/format';
import type { PriceItem } from '@/lib/types';

type Point = { dt: string; p: number; src: string };

const series = (x: PriceItem): Point[] => [...(x.history ?? []), { dt: x.dt, p: x.p, src: x.src }];

function Spark({ pts, w = 72, h = 22 }: { pts: Point[]; w?: number; h?: number }) {
  if (pts.length < 2) return <span className="muted small">-</span>;
  const vs = pts.map((x) => x.p);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const xy = vs.map((v, i) => [(i / (vs.length - 1)) * (w - 4) + 2, hi === lo ? h / 2 : h - 3 - ((v - lo) / (hi - lo)) * (h - 6)]);
  const up = vs[vs.length - 1] >= vs[0];
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: 'block' }}>
      <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={up ? 'var(--amber)' : 'var(--green)'} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.2} fill={up ? 'var(--amber)' : 'var(--green)'} />
    </svg>
  );
}

function AgePill({ d }: { d: string }) {
  const a = -days(d);
  return <span className={`pill ${a > 90 ? 'p-amber' : 'p-green'}`}>{a} days</span>;
}

function ValidPill({ d }: { d?: string }) {
  if (!d) return <span className="muted small">-</span>;
  const n = days(d);
  if (n < 0) return <span className="pill p-red">Expired {dshort(d)}</span>;
  if (n <= 14) return <span className="pill p-amber">Expires in {n}d</span>;
  return <span className="pill p-grey">To {dshort(d)}</span>;
}

export default function PriceBookPage() {
  const canPrices = useCan('prices');
  const prices = useStore((s) => s.prices);
  const notify = useStore((s) => s.notify);
  const [cat, setCat] = useState<string>('All');
  const [sel, setSel] = useState<string | null>(null);

  if (!canPrices) return <Locked what="The price book" />;

  const cats = ['All', ...new Set(prices.map((p) => p.cat))];
  const rows = cat === 'All' ? prices : prices.filter((p) => p.cat === cat);
  const stale = prices.filter((p) => -days(p.dt) > 90).length;
  const item = prices.find((p) => p.sku === sel);

  return (
    <div className="fade">
      <div className="demo">
        <Icon name="warning" s />
        Demo prices. No timber merchant offers a public price API, so the real price book fills itself from supplier quotes, invoices and Xero bills.
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {cats.map((c) => (
          <button key={c} className={`chip ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c}
            <span className="num" style={{ opacity: 0.6 }}>
              {c === 'All' ? prices.length : prices.filter((p) => p.cat === c).length}
            </span>
          </button>
        ))}
      </div>
      <div className="card flush">
        <div className="hd" style={{ flexWrap: 'wrap' }}>
          <h2>
            <Icon name="package" s />
            Price book
          </h2>
          <span className="muted small">
            {prices.length} items{stale ? `, ${stale} older than 90 days` : ''}
          </span>
          <button className="btn sm" onClick={() => notify('Drop a supplier PDF to update prices')}>
            <Icon name="upload-simple" s />
            Add supplier PDF
          </button>
        </div>
        <div className="scroll-x">
          <table className="t">
            <thead>
              <tr>
                <th>Item</th>
                <th className="hide-m">Supplier</th>
                <th className="r">Price</th>
                <th>Unit</th>
                <th className="hide-m">Source</th>
                <th>Age</th>
                <th>Valid</th>
                <th className="hide-m">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.sku} className={`click ${sel === p.sku ? 'sel' : ''}`} onClick={() => setSel(p.sku)}>
                  <td style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 500 }}>{p.d}</div>
                    <div className="muted small num">
                      {p.sku} · {p.cat}
                    </div>
                  </td>
                  <td className="small hide-m">{p.sup}</td>
                  <td className="r num">{gbp(p.p, 2)}</td>
                  <td className="small">{p.unit}</td>
                  <td className="small muted hide-m">{p.src}</td>
                  <td>
                    <AgePill d={p.dt} />
                  </td>
                  <td>
                    <ValidPill d={p.validUntil} />
                  </td>
                  <td className="hide-m">
                    <Spark pts={series(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Drawer open={item != null} title={item ? item.sku : ''} onClose={() => setSel(null)}>
        {item && <PriceDetail key={item.sku + item.dt + item.p} x={item} />}
      </Drawer>
    </div>
  );
}

function PriceDetail({ x }: { x: PriceItem }) {
  const updatePrice = useStore((s) => s.updatePrice);
  const notify = useStore((s) => s.notify);
  const [p, setP] = useState(String(x.p));
  const [src, setSrc] = useState('');
  const pts = series(x);
  const first = pts[0].p;
  const v = parseFloat(p);
  const ok = v > 0 && src.trim().length > 0;

  return (
    <div>
      <div style={{ fontWeight: 600 }}>{x.d}</div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {x.sup} · per {x.unit} · {x.cat}
        {x.thick ? ` · ${x.thick}mm` : ''}
      </div>
      <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
        <div className="num" style={{ fontSize: 26, letterSpacing: '-.03em' }}>
          {gbp(x.p, 2)}
        </div>
        <AgePill d={x.dt} />
        <ValidPill d={x.validUntil} />
        <span className="sp" />
        <Spark pts={pts} w={120} h={36} />
      </div>
      {pts.length > 1 && (
        <div className={`small ${x.p >= first ? 'down' : 'up'}`} style={{ marginTop: 6 }}>
          {x.p >= first ? '+' : ''}
          {(((x.p - first) / first) * 100).toFixed(1)}% since {dt(pts[0].dt)}
        </div>
      )}

      <div className="card flush" style={{ marginTop: 16 }}>
        <div className="hd">
          <h2>
            <Icon name="clock" s />
            Price history
          </h2>
        </div>
        <table className="t">
          <tbody>
            {[...pts].reverse().map((h, i) => (
              <tr key={h.dt + i}>
                <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                  {dt(h.dt)}
                </td>
                <td className="small muted">
                  {h.src}
                  {i === 0 && (
                    <span className="pill p-gold" style={{ marginLeft: 6 }}>
                      Current
                    </span>
                  )}
                </td>
                <td className="r num">{gbp(h.p, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="card"
        style={{ marginTop: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          updatePrice(x.sku, Math.round(v * 100) / 100, src.trim());
          notify(`${x.sku} updated to ${gbp(v, 2)}`);
        }}
      >
        <h2>
          <Icon name="plus" s />
          Record a new price
        </h2>
        <div className="grid" style={{ gridTemplateColumns: '120px 1fr', gap: 10, marginTop: 12 }}>
          <div className="field">
            <label htmlFor="np">Price (£)</label>
            <input id="np" className="inp num" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ns">Source</label>
            <input id="ns" className="inp" placeholder="e.g. Invoice SI-77901, 24 Oct 2026" value={src} onChange={(e) => setSrc(e.target.value)} />
          </div>
        </div>
        <div className="hint">The old price moves into the history, and estimates using this item reprice straight away.</div>
        <button className="btn dark" type="submit" disabled={!ok} style={{ marginTop: 12 }}>
          <Icon name="check" s />
          Save price
        </button>
      </form>
    </div>
  );
}
