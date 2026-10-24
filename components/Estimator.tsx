'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Card, Drawer, Locked, useCan } from './ui';
import { Drawing, SheetView } from './Drawing';
import { DesignPicker } from './DesignPicker';
import { NumInput, TextInput } from './NumInput';
import { useStore, useProject, useClient } from '@/lib/store';
import { costEstimate, cutDims, quoteLines, RATE_LABEL, type Check } from '@/lib/estimate';
import { dt, dtime, gbp } from '@/lib/format';
import type { DesignSpec, Estimate, EstimateItem, Grain, RateKind } from '@/lib/types';

export function Estimator({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const client = useClient(project?.client);
  const est = useStore((s) => s.estimates.find((e) => e.projectId === projectId));
  const prices = useStore((s) => s.prices);
  const rates = useStore((s) => s.rates);
  const editEstimate = useStore((s) => s.editEstimate);
  const addItem = useStore((s) => s.addItem);
  const canEstimate = useCan('estimate');
  const [itemId, setItemId] = useState<string | null>(null);
  const [partSel, setPartSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);

  const cost = useMemo(() => (est ? costEstimate(est, prices, rates) : null), [est, prices, rates]);

  if (!canEstimate) return <Locked what="Estimating and prices" />;
  if (!project || !client) return <div className="empty">Project not found</div>;
  if (!est || !cost)
    return (
      <div className="card empty">
        No estimate yet for {project.title}.{' '}
        <Link className="btn sm dark" href={`/projects/${projectId}`}>
          Start one from the project
        </Link>
      </div>
    );

  const item = est.items.find((i) => i.id === itemId) ?? est.items[0];
  const ic = item ? cost.items[est.items.indexOf(item)] : null;
  const locked = est.status !== 'draft';
  const q = quoteLines(est, cost);
  const blocking = cost.checks.filter((c) => c.level !== 'blue').length;

  return (
    <div className="fade">
      <div className="pagehead">
        <div>
          <div className="muted small num">
            {project.id} · {project.sector} · Estimate {est.id} rev {est.rev}
            {item?.drawing && ` · from ${item.drawing.file}, read ${dtime(item.drawing.extracted)}`}
          </div>
          <h2 className="h2x">Estimate: {project.title}</h2>
          <div className="muted">
            {client.name}, {client.city}. {est.items.length} item{est.items.length === 1 ? '' : 's'}, {cost.items.reduce((a, i) => a + i.lines.length, 0)} costed lines
          </div>
        </div>
        <span className="sp" />
        <StatusPill est={est} />
        {item && item.parts.length > 0 && (
          <Link className="btn" href={`/projects/${projectId}/model?item=${item.id}`}>
            <Icon name="cube" s />
            3D model
          </Link>
        )}
        <Link className="btn" href={`/portal/${est.token}?preview=1`}>
          <Icon name="eye" s />
          Client view
        </Link>
        {est.status === 'draft' && (
          <button className="btn dark" onClick={() => setSending(true)} disabled={!est.items.length}>
            <Icon name="paper-plane-tilt" s />
            Send to client portal
          </button>
        )}
        {est.status === 'sent' && (
          <button
            className="btn"
            onClick={() =>
              editEstimate(est.id, (e) => {
                e.status = 'draft';
                e.rev += 1;
              })
            }
          >
            <Icon name="arrows-clockwise" s />
            Revise (rev {est.rev + 1})
          </button>
        )}
      </div>

      {locked && (
        <div className="demo">
          <Icon name="lock-key" s />
          {est.status === 'approved'
            ? `Approved by ${est.signature?.name} on ${dt(est.approvedAt!)}. Prices are locked; changes from here are variations.`
            : `Sent ${dt(est.sentAt!)}. Revise to change it, which issues rev ${est.rev + 1}.`}
        </div>
      )}

      <div className="itemtabs">
        {est.items.map((it, i) => (
          <button key={it.id} className={`itemtab ${it.id === item?.id ? 'on' : ''}`} onClick={() => { setItemId(it.id); setPartSel(null); }}>
            <div className="n">
              {it.name}
              {it.qty > 1 ? ` x ${it.qty}` : ''}
            </div>
            <div className="v">
              {gbp(q.lines[i].price)} · {it.parts.length} parts
            </div>
          </button>
        ))}
        {!locked && (
          <button className="itemtab" onClick={() => setAdding(true)} style={{ borderStyle: 'dashed' }}>
            <div className="n row" style={{ gap: 6 }}>
              <Icon name="plus" s />
              Add item
            </div>
            <div className="v">cabinet, table, labour</div>
          </button>
        )}
      </div>

      {!item || !ic ? (
        <div className="card empty">Add the first item to start pricing.</div>
      ) : (
        <>
          <div className="grid g2">
            <Card title="Drawing" icon="ruler" right={item.drawing ? <span className="pill p-green">Extracted {item.parts.length} parts</span> : item.design ? <span className="pill p-blue">From parameters</span> : null}>
              <div className="drawing" style={{ marginTop: 12 }}>
                <Drawing parts={item.parts} title={item.name} client={client.name} rev={item.drawing?.rev} selected={partSel} onPick={setPartSel} />
              </div>
              <p className="muted small" style={{ marginTop: 10 }}>
                {item.drawing
                  ? 'Dimensions read from the vector layer of the PDF and checked against the title block. Redrawn here from the cutting list, so any edit below shows up on the drawing. Rows under 80% confidence need a person to check them.'
                  : 'Drawn from the cutting list below. Change a dimension or a design parameter and the drawing, price and 3D model all follow.'}
              </p>
            </Card>
            <div className="grid" style={{ alignContent: 'start' }}>
              <Totals est={est} cost={cost} quoteTotal={q.total} locked={locked} itemPrice={q.lines[est.items.indexOf(item)].price} itemName={item.name} multi={est.items.length > 1} />
              <Checks est={est} checks={cost.checks} onPart={(itId, pid) => { setItemId(itId); setPartSel(pid); document.getElementById('cutlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} locked={locked} />
            </div>
          </div>

          {item.design && <DesignCard est={est} item={item} locked={locked} />}
          <ItemMeta est={est} item={item} locked={locked} />
          <CuttingList est={est} item={item} sel={partSel} onSel={setPartSel} locked={locked} />

          <div className="grid g2 mt16">
            <Labour est={est} item={item} locked={locked} />
            <Extras est={est} item={item} locked={locked} />
          </div>
          <Subs est={est} item={item} locked={locked} />

          <div className="grid g2 mt16">
            <Card flush title="Costed lines" icon="currency-gbp" right={<span className="muted small">{item.name}</span>}>
              <div className="scroll-x">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="r">Qty</th>
                      <th className="r">Rate</th>
                      <th className="r">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ic.lines.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div className="small muted">{l.group}</div>
                          {l.desc}
                        </td>
                        <td className="r num">
                          {l.qty} {l.unit}
                        </td>
                        <td className="r num">{gbp(l.rate, 2)}</td>
                        <td className="r num">{gbp(l.cost)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="muted">Overheads {est.overheadPct}% of {est.overheadBase === 'labour' ? 'labour' : 'all costs'}</td>
                      <td />
                      <td />
                      <td className="r num">{gbp(ic.over)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Cost of this item</td>
                      <td />
                      <td />
                      <td className="r num" style={{ fontWeight: 600 }}>
                        {gbp(ic.cost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Sheet layouts" icon="squares-four" right={<span>4mm kerf, 10mm trim, grain respected</span>}>
              {ic.nests.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>No sheet materials on this item.</p>}
              {ic.nests.map((n) => (
                <div key={n.sku} style={{ marginTop: 14 }}>
                  <div className="row small" style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{n.desc.split(',')[0]}</span>
                    <span className="sp" />
                    <span className="num muted">
                      {n.result.sheets.length} sheet{n.result.sheets.length === 1 ? '' : 's'}, {Math.round(n.result.yield * 100)}% yield
                    </span>
                  </div>
                  <SheetView result={n.result} label={n.desc} />
                </div>
              ))}
              {ic.nests.length > 0 && (
                <div className="legend" style={{ marginTop: 12 }}>
                  <span>
                    <i style={{ background: 'var(--goldbg)', border: '1px solid var(--gold)' }} />
                    With the grain
                  </span>
                  <span>
                    <i style={{ background: '#eef3fb', border: '1px solid var(--blue)' }} />
                    Turned 90°
                  </span>
                </div>
              )}
            </Card>
          </div>
          <Settings est={est} locked={locked} />
        </>
      )}

      <Drawer open={adding} title="Add an item to this estimate" onClose={() => setAdding(false)}>
        <DesignPicker
          onDone={(spec, name) => {
            const id = addItem(est.id, spec, name);
            setItemId(id);
            setAdding(false);
          }}
        />
      </Drawer>
      <SendDrawer open={sending} onClose={() => setSending(false)} projectId={projectId} blocking={blocking} total={q.total} />
    </div>
  );
}

function StatusPill({ est }: { est: Estimate }) {
  if (est.status === 'approved') return <span className="pill p-green">Approved rev {est.rev}</span>;
  if (est.status === 'sent') return <span className="pill p-blue">Sent rev {est.rev}</span>;
  return <span className="pill p-grey">Draft rev {est.rev}</span>;
}

function Totals({ est, cost, quoteTotal, locked, itemPrice, itemName, multi }: { est: Estimate; cost: ReturnType<typeof costEstimate>; quoteTotal: number; locked: boolean; itemPrice: number; itemName: string; multi: boolean }) {
  const editEstimate = useStore((s) => s.editEstimate);
  const rows: [string, number][] = [
    ['Materials', cost.mat],
    ['Finishing', cost.fin],
    [`Labour, ${Math.round(cost.hours)} hrs`, cost.labour],
    [`Overheads ${est.overheadPct}% of ${est.overheadBase === 'labour' ? 'labour' : 'all costs'}`, cost.over],
    ['Subcontract', cost.sub],
    ['Total cost', cost.cost],
    ['Profit', cost.profit],
  ];
  return (
    <div className="total">
      <div className="row">
        <div>
          <div className="l">Quote price ex VAT{multi ? `, ${est.items.length} items` : ''}</div>
          <div className="v">{gbp(quoteTotal)}</div>
        </div>
        <span className="sp" />
        {multi && (
          <div style={{ textAlign: 'right' }}>
            <div className="l">{itemName}</div>
            <div className="num" style={{ fontSize: 16, marginTop: 4 }}>
              {gbp(itemPrice)}
            </div>
          </div>
        )}
      </div>
      <div style={{ margin: '14px 0 6px' }} className="row small">
        <span>Margin on price</span>
        <span className="sp" />
        <span className="num">{est.margin}%</span>
        <span className="num" style={{ color: 'rgba(255,255,255,.55)' }}>
          ({Math.round((cost.profit / cost.cost) * 100)}% markup)
        </span>
      </div>
      <input
        type="range"
        min={10}
        max={55}
        value={est.margin}
        disabled={locked}
        aria-label="Margin"
        onChange={(e) =>
          editEstimate(est.id, (x) => {
            x.margin = +e.target.value;
          })
        }
      />
      <div style={{ marginTop: 12 }}>
        {rows.map(([n, v]) => (
          <div className="rowx" key={n}>
            <span>{n}</span>
            <span className="num">{gbp(v)}</span>
          </div>
        ))}
      </div>
      {est.items.some((i) => i.qty > 1) && <div className="small" style={{ marginTop: 8, color: 'rgba(255,255,255,.55)' }}>Totals include item quantities.</div>}
    </div>
  );
}

function Checks({ est, checks, onPart, locked }: { est: Estimate; checks: Check[]; onPart: (itemId: string, partId: string) => void; locked: boolean }) {
  const updatePart = useStore((s) => s.updatePart);
  const updatePrice = useStore((s) => s.updatePrice);
  const requestSubPrice = useStore((s) => s.requestSubPrice);
  const notify = useStore((s) => s.notify);
  const prices = useStore((s) => s.prices);
  const pill = (c: Check) => (c.level === 'red' ? 'p-red' : c.level === 'amber' ? 'p-amber' : 'p-blue');
  return (
    <Card title="Check before sending" icon="warning" right={checks.length ? <span className="num">{checks.length} open</span> : undefined}>
      <div className="small" style={{ marginTop: 10, display: 'grid', gap: 9 }}>
        {!checks.length && (
          <div className="row">
            <span className="pill p-green">
              <Icon name="check-circle" s />
              Clear
            </span>
            <span>Every part checked, prices current, subcontract prices firm.</span>
          </div>
        )}
        {checks.map((c, i) => (
          <div className="row" key={i} style={{ alignItems: 'flex-start' }}>
            <span className={`pill ${pill(c)}`} style={{ minWidth: 54, justifyContent: 'center' }}>
              {c.tag}
            </span>
            <span className="sp" style={{ paddingTop: 2 }}>
              {c.text}
            </span>
            {!locked && c.partId && c.itemId && (
              <>
                <button className="btn sm" onClick={() => onPart(c.itemId!, c.partId!)}>
                  Show
                </button>
                <button
                  className="btn sm"
                  onClick={() => {
                    updatePart(est.id, c.itemId!, c.partId!, { checked: true });
                    notify('Marked as checked against the drawing');
                  }}
                >
                  <Icon name="check" s />
                  Checked
                </button>
              </>
            )}
            {!locked && c.sku && (
              <button
                className="btn sm"
                onClick={() => {
                  const pi = prices.find((p) => p.sku === c.sku)!;
                  const np = +(pi.p * (1 + (pi.sku.length % 4) / 100)).toFixed(2);
                  updatePrice(pi.sku, np, `Requote, ${pi.sup}`);
                  notify(`${pi.sup} requoted: ${gbp(pi.p, 2)} to ${gbp(np, 2)}`);
                }}
              >
                <Icon name="arrows-clockwise" s />
                Requote
              </button>
            )}
            {!locked && c.subId && c.itemId && c.tag === 'Subcontract' && (
              <button className="btn sm" onClick={() => requestSubPrice(est.id, c.itemId!, c.subId!)}>
                <Icon name="paper-plane-tilt" s />
                Request
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DesignCard({ est, item, locked }: { est: Estimate; item: EstimateItem; locked: boolean }) {
  const setDesign = useStore((s) => s.setDesign);
  const prices = useStore((s) => s.prices);
  const d = item.design!;
  const set = (patch: Partial<DesignSpec>) => setDesign(est.id, item.id, { ...d, ...patch });
  const boards = prices.filter((p) => p.unit === 'sheet');
  const solids = prices.filter((p) => p.unit === 'm3');
  const handles = prices.filter((p) => p.cat === 'Hardware' && p.unit === 'each' && /HDL/.test(p.sku));
  const num = (k: keyof DesignSpec, label: string, min = 0) => (
    <div className="field">
      <label>{label}</label>
      <NumInput className="inp num" value={d[k] as number} min={min} disabled={locked} onCommit={(v) => set({ [k]: v } as Partial<DesignSpec>)} label={label} />
    </div>
  );
  return (
    <Card className="mt16" title="Design parameters" icon="sliders" right={<span>Rebuilds the cutting list and scales workshop and finishing hours</span>}>
      <div className="param" style={{ marginTop: 14 }}>
        {num('W', 'Width mm', 200)}
        {num('H', 'Height mm', 200)}
        {num('D', 'Depth mm', 150)}
        {d.kind !== 'table' && num('bays', 'Bays', 1)}
        {d.kind !== 'table' && num('shelves', 'Shelves per bay')}
        {d.kind !== 'table' && num('plinth', 'Plinth mm')}
        <div className="field">
          <label>Main board</label>
          <select className="inp" value={d.carcass} disabled={locked} onChange={(e) => set({ carcass: e.target.value })}>
            {boards.map((b) => (
              <option key={b.sku} value={b.sku}>
                {b.sku}
              </option>
            ))}
          </select>
        </div>
        {d.kind === 'table' ? (
          <div className="field">
            <label>Legs and aprons</label>
            <select className="inp" value={d.legSku} disabled={locked} onChange={(e) => set({ legSku: e.target.value })}>
              {solids.map((b) => (
                <option key={b.sku} value={b.sku}>
                  {b.sku}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Back</label>
              <select className="inp" value={d.back} disabled={locked} onChange={(e) => set({ back: e.target.value })}>
                {boards.map((b) => (
                  <option key={b.sku} value={b.sku}>
                    {b.sku}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Handles</label>
              <select className="inp" value={d.handle ?? ''} disabled={locked || !d.doors} onChange={(e) => set({ handle: e.target.value || null })}>
                <option value="">None (push latch)</option>
                {handles.map((b) => (
                  <option key={b.sku} value={b.sku}>
                    {b.sku}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        {d.kind !== 'table' && (
          <button className={`chip ${d.doors ? 'on' : ''}`} disabled={locked} onClick={() => set({ doors: !d.doors })}>
            Doors
          </button>
        )}
        <button className={`chip ${d.brassEdge ? 'on' : ''}`} disabled={locked} onClick={() => set({ brassEdge: !d.brassEdge })}>
          Brass edge
        </button>
      </div>
    </Card>
  );
}

function ItemMeta({ est, item, locked }: { est: Estimate; item: EstimateItem; locked: boolean }) {
  const editItem = useStore((s) => s.editItem);
  const removeItem = useStore((s) => s.removeItem);
  const prices = useStore((s) => s.prices);
  const fins = prices.filter((p) => p.cat === 'Finishing');
  const edges = prices.filter((p) => p.cat === 'Edging');
  return (
    <Card className="mt16" title="Item" icon="file-text" right={!locked && est.items.length > 1 ? <button className="btn sm red" onClick={() => removeItem(est.id, item.id)}><Icon name="trash" s />Remove item</button> : undefined}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 90px 1fr 1fr', gap: 10, marginTop: 12 }}>
        <div className="field">
          <label>Name</label>
          {locked ? <div>{item.name}</div> : <TextInput className="inp" value={item.name} onCommit={(v) => editItem(est.id, item.id, (i) => void (i.name = v))} />}
        </div>
        <div className="field">
          <label>Quantity</label>
          <NumInput className="inp num" value={item.qty} min={1} disabled={locked} onCommit={(v) => editItem(est.id, item.id, (i) => void (i.qty = Math.round(v)))} />
        </div>
        <div className="field">
          <label>Finish</label>
          <select className="inp" value={item.finishSku ?? 'LAC-PU'} disabled={locked} onChange={(e) => editItem(est.id, item.id, (i) => void (i.finishSku = e.target.value))}>
            {fins.map((f) => (
              <option key={f.sku} value={f.sku}>
                {f.d.split(',')[0]} ({gbp(f.p)}/m2)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Edging</label>
          <select className="inp" value={item.edgeSku ?? 'EDG-WAL-2'} disabled={locked} onChange={(e) => editItem(est.id, item.id, (i) => void (i.edgeSku = e.target.value))}>
            {edges.map((f) => (
              <option key={f.sku} value={f.sku}>
                {f.d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Description the client sees</label>
        {locked ? <div className="small">{item.desc}</div> : <TextInput className="inp" value={item.desc} onCommit={(v) => editItem(est.id, item.id, (i) => void (i.desc = v))} />}
      </div>
    </Card>
  );
}

function CuttingList({ est, item, sel, onSel, locked }: { est: Estimate; item: EstimateItem; sel: string | null; onSel: (id: string | null) => void; locked: boolean }) {
  const prices = useStore((s) => s.prices);
  const updatePart = useStore((s) => s.updatePart);
  const setPartDim = useStore((s) => s.setPartDim);
  const addPart = useStore((s) => s.addPart);
  const removePart = useStore((s) => s.removePart);
  const notify = useStore((s) => s.notify);
  const mats = prices.filter((p) => p.cat !== 'Finishing' && p.cat !== 'Edging');

  const csv = () => {
    const rows = [['#', 'Part', 'Material', 'Length', 'Width', 'Thickness', 'Qty', 'Grain', 'Edging m']];
    item.parts.forEach((p, i) => {
      const [L, W, T] = cutDims(p);
      rows.push([String(i + 1), p.name, p.sku, String(L), String(W), String(T), String(p.qty * item.qty), p.grain, p.edge.toFixed(2)]);
    });
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${est.projectId}-${item.name.replace(/\W+/g, '-')}-cutting-list.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Cutting list CSV downloaded');
  };

  return (
    <div className="card flush mt16" id="cutlist">
      <div className="hd">
        <h2>
          <Icon name="list-checks" s />
          Cutting list
        </h2>
        <span className="muted small">
          {item.parts.length} parts{item.qty > 1 ? `, x ${item.qty}` : ''}
        </span>
        {!locked && (
          <button className="btn sm" onClick={() => addPart(est.id, item.id)}>
            <Icon name="plus" s />
            Part
          </button>
        )}
        <button className="btn sm" onClick={csv} disabled={!item.parts.length}>
          <Icon name="download-simple" s />
          CSV for the saw
        </button>
      </div>
      {!item.parts.length ? (
        <div className="empty small">No parts. This item is priced from labour, extras and subcontract.</div>
      ) : (
        <div className="scroll-x">
          <table className="t" id="cuttable">
            <thead>
              <tr>
                <th className="tight">#</th>
                <th>Part</th>
                <th>Material</th>
                <th className="r">Length</th>
                <th className="r">Width</th>
                <th className="r">Thick</th>
                <th className="r">Qty</th>
                <th>Grain</th>
                <th className="r">Edging m</th>
                <th>Read</th>
                {!locked && <th />}
              </tr>
            </thead>
            <tbody>
              {item.parts.map((p, i) => {
                const [L, W, T] = cutDims(p);
                const flag = p.conf < 80 && !p.checked;
                return (
                  <tr key={p.id} className={`click ${sel === p.id ? 'sel' : ''} ${flag ? 'flag' : ''}`} onClick={() => onSel(p.id === sel ? null : p.id)}>
                    <td className="num muted tight">{i + 1}</td>
                    <td onClick={(e) => !locked && e.stopPropagation()}>
                      {locked ? p.name : <TextInput value={p.name} onCommit={(v) => updatePart(est.id, item.id, p.id, { name: v })} />}
                      {p.note && <div className="hint">{p.note}</div>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select className="inp sm" value={p.sku} disabled={locked} onChange={(e) => updatePart(est.id, item.id, p.id, { sku: e.target.value })} style={{ maxWidth: 150 }}>
                        {!mats.some((m) => m.sku === p.sku) && <option value={p.sku}>{p.sku} (not in price book)</option>}
                        {mats.map((m) => (
                          <option key={m.sku} value={m.sku}>
                            {m.sku}
                          </option>
                        ))}
                      </select>
                    </td>
                    {([L, W, T] as number[]).map((v, k) => (
                      <td key={k} className="r" onClick={(e) => e.stopPropagation()}>
                        {locked ? <span className="num">{Math.round(v)}</span> : <NumInput value={Math.round(v)} min={1} width={76} onCommit={(n) => setPartDim(est.id, item.id, p.id, k as 0 | 1 | 2, n)} label={`${p.name} ${['length', 'width', 'thickness'][k]}`} />}
                      </td>
                    ))}
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      {locked ? <span className="num">{p.qty}</span> : <NumInput value={p.qty} min={1} width={56} onCommit={(n) => updatePart(est.id, item.id, p.id, { qty: Math.round(n) })} />}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select className="inp sm" value={p.grain} disabled={locked} onChange={(e) => updatePart(est.id, item.id, p.id, { grain: e.target.value as Grain })} style={{ width: 62 }}>
                        <option value="L">L</option>
                        <option value="W">W</option>
                        <option value="-">-</option>
                      </select>
                    </td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      {locked ? <span className="num">{p.edge ? p.edge.toFixed(2) : ''}</span> : <NumInput value={p.edge} step={0.1} min={0} width={70} onCommit={(n) => updatePart(est.id, item.id, p.id, { edge: n })} />}
                    </td>
                    <td>
                      <span className={`conf ${flag ? 'down' : ''}`}>{p.conf}%</span>
                      {p.conf < 80 && p.checked && (
                        <span title="Checked by a person" style={{ marginLeft: 4, color: 'var(--green)' }}>
                          <Icon name="check" s />
                        </span>
                      )}
                    </td>
                    {!locked && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn sm" aria-label={`Remove ${p.name}`} onClick={() => removePart(est.id, item.id, p.id)}>
                          <Icon name="trash" s />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Labour({ est, item, locked }: { est: Estimate; item: EstimateItem; locked: boolean }) {
  const editItem = useStore((s) => s.editItem);
  const rates = useStore((s) => s.rates);
  const total = item.ops.reduce((a, o) => a + o.hours * rates[o.rate], 0);
  return (
    <Card
      flush
      title="Labour by operation"
      icon="hammer"
      right={
        !locked ? (
          <button className="btn sm" onClick={() => editItem(est.id, item.id, (i) => void i.ops.push({ id: 'O' + Date.now(), name: 'New operation', hours: 4, rate: 'workshop' }))}>
            <Icon name="plus" s />
            Operation
          </button>
        ) : undefined
      }
    >
      <div className="scroll-x">
        <table className="t">
          <thead>
            <tr>
              <th>Operation</th>
              <th>Rate</th>
              <th className="r">Hours</th>
              <th className="r">Cost</th>
              {!locked && <th />}
            </tr>
          </thead>
          <tbody>
            {item.ops.map((o) => (
              <tr key={o.id}>
                <td>{locked ? o.name : <TextInput value={o.name} onCommit={(v) => editItem(est.id, item.id, (i) => void (i.ops.find((x) => x.id === o.id)!.name = v))} />}</td>
                <td>
                  <select className="inp sm" value={o.rate} disabled={locked} onChange={(e) => editItem(est.id, item.id, (i) => void (i.ops.find((x) => x.id === o.id)!.rate = e.target.value as RateKind))}>
                    {(Object.keys(RATE_LABEL) as RateKind[]).map((k) => (
                      <option key={k} value={k}>
                        {RATE_LABEL[k]} £{rates[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="r">{locked ? <span className="num">{o.hours}</span> : <NumInput value={o.hours} min={0} step={0.5} width={70} onCommit={(n) => editItem(est.id, item.id, (i) => void (i.ops.find((x) => x.id === o.id)!.hours = n))} />}</td>
                <td className="r num">{gbp(o.hours * rates[o.rate])}</td>
                {!locked && (
                  <td>
                    <button className="btn sm" aria-label="Remove operation" onClick={() => editItem(est.id, item.id, (i) => void (i.ops = i.ops.filter((x) => x.id !== o.id)))}>
                      <Icon name="trash" s />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 600 }}>Per item</td>
              <td />
              <td className="r num" style={{ fontWeight: 600 }}>
                {item.ops.reduce((a, o) => a + o.hours, 0)}
              </td>
              <td className="r num" style={{ fontWeight: 600 }}>
                {gbp(total)}
              </td>
              {!locked && <td />}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="small muted" style={{ padding: '10px 18px' }}>
        Hourly rates include employer NI and pension. Once timesheets are logged per job, past hours for similar work show here.
      </div>
    </Card>
  );
}

function Extras({ est, item, locked }: { est: Estimate; item: EstimateItem; locked: boolean }) {
  const editItem = useStore((s) => s.editItem);
  const prices = useStore((s) => s.prices);
  const opts = prices.filter((p) => p.unit !== 'sheet' && p.cat !== 'Finishing' && p.cat !== 'Edging');
  return (
    <Card
      flush
      title="Hardware and bought-in"
      icon="package"
      right={
        !locked ? (
          <button className="btn sm" onClick={() => editItem(est.id, item.id, (i) => void i.extras.push({ id: 'X' + Date.now(), sku: 'BLM-MOV-500', qty: 1 }))}>
            <Icon name="plus" s />
            Add
          </button>
        ) : undefined
      }
    >
      <div className="scroll-x">
        <table className="t">
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Qty</th>
              <th className="r">Each</th>
              <th className="r">Cost</th>
              {!locked && <th />}
            </tr>
          </thead>
          <tbody>
            {!item.extras.length && (
              <tr>
                <td colSpan={5} className="muted small">
                  Nothing bought in for this item.
                </td>
              </tr>
            )}
            {item.extras.map((x) => {
              const pi = prices.find((p) => p.sku === x.sku);
              return (
                <tr key={x.id}>
                  <td>
                    <select className="inp sm" value={x.sku} disabled={locked} onChange={(e) => editItem(est.id, item.id, (i) => void (i.extras.find((y) => y.id === x.id)!.sku = e.target.value))} style={{ maxWidth: 220 }}>
                      {opts.map((o) => (
                        <option key={o.sku} value={o.sku}>
                          {o.d.split(',')[0]}
                        </option>
                      ))}
                    </select>
                    {x.note && <div className="hint">{x.note}</div>}
                  </td>
                  <td className="r">{locked ? <span className="num">{x.qty}</span> : <NumInput value={x.qty} min={0} width={64} onCommit={(n) => editItem(est.id, item.id, (i) => void (i.extras.find((y) => y.id === x.id)!.qty = n))} />}</td>
                  <td className="r num small">
                    {pi ? gbp(pi.p, 2) : '-'}/{pi?.unit}
                  </td>
                  <td className="r num">{pi ? gbp(pi.p * x.qty) : '-'}</td>
                  {!locked && (
                    <td>
                      <button className="btn sm" aria-label="Remove" onClick={() => editItem(est.id, item.id, (i) => void (i.extras = i.extras.filter((y) => y.id !== x.id)))}>
                        <Icon name="trash" s />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Subs({ est, item, locked }: { est: Estimate; item: EstimateItem; locked: boolean }) {
  const editItem = useStore((s) => s.editItem);
  const requestSubPrice = useStore((s) => s.requestSubPrice);
  const edit = (id: string, f: (s: EstimateItem['subs'][number]) => void) => editItem(est.id, item.id, (i) => f(i.subs.find((x) => x.id === id)!));
  return (
    <Card
      flush
      className="mt16"
      title="Subcontract crafts"
      icon="storefront"
      right={
        !locked ? (
          <button className="btn sm" onClick={() => editItem(est.id, item.id, (i) => void i.subs.push({ id: 'U' + Date.now(), trade: 'Gilding', desc: 'Water gilding to aprons', supplier: 'Gilding studio', lo: 1200, hi: 1800, status: 'range' }))}>
            <Icon name="plus" s />
            Subcontract
          </button>
        ) : undefined
      }
    >
      <div className="scroll-x">
        <table className="t">
          <thead>
            <tr>
              <th>Trade and work</th>
              <th>Supplier</th>
              <th className="r">Low</th>
              <th className="r">High</th>
              <th className="r">Firm price</th>
              <th>Status</th>
              {!locked && <th />}
            </tr>
          </thead>
          <tbody>
            {!item.subs.length && (
              <tr>
                <td colSpan={7} className="muted small">
                  No subcontract work on this item. Brackenbury subcontracts most specialist crafts, so a price request link per trade saves the most time.
                </td>
              </tr>
            )}
            {item.subs.map((s) => (
              <tr key={s.id}>
                <td>
                  {locked ? (
                    <>
                      <div style={{ fontWeight: 500 }}>{s.trade}</div>
                      <div className="small muted">{s.desc}</div>
                    </>
                  ) : (
                    <div className="grid" style={{ gap: 4 }}>
                      <TextInput value={s.trade} onCommit={(v) => edit(s.id, (x) => void (x.trade = v))} />
                      <TextInput value={s.desc} onCommit={(v) => edit(s.id, (x) => void (x.desc = v))} />
                    </div>
                  )}
                </td>
                <td className="small">{locked ? s.supplier : <TextInput value={s.supplier} onCommit={(v) => edit(s.id, (x) => void (x.supplier = v))} />}</td>
                <td className="r">{locked ? <span className="num">{gbp(s.lo)}</span> : <NumInput value={s.lo} min={0} width={84} onCommit={(n) => edit(s.id, (x) => void (x.lo = n))} />}</td>
                <td className="r">{locked ? <span className="num">{gbp(s.hi)}</span> : <NumInput value={s.hi} min={0} width={84} onCommit={(n) => edit(s.id, (x) => void (x.hi = n))} />}</td>
                <td className="r">
                  {locked ? (
                    <span className="num">{s.firm != null ? gbp(s.firm) : '-'}</span>
                  ) : (
                    <NumInput
                      value={s.firm ?? 0}
                      min={0}
                      width={90}
                      onCommit={(n) =>
                        edit(s.id, (x) => {
                          x.firm = n > 0 ? n : undefined;
                          x.status = n > 0 ? 'firm' : 'range';
                        })
                      }
                      label="Firm price"
                    />
                  )}
                </td>
                <td>{s.status === 'firm' ? <span className="pill p-green">Firm</span> : s.status === 'requested' ? <span className="pill p-blue">Requested</span> : <span className="pill p-amber">Range</span>}</td>
                {!locked && (
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {s.status === 'range' && (
                        <button className="btn sm" onClick={() => requestSubPrice(est.id, item.id, s.id)}>
                          <Icon name="paper-plane-tilt" s />
                          Request
                        </button>
                      )}
                      <button className="btn sm" aria-label="Remove" onClick={() => editItem(est.id, item.id, (i) => void (i.subs = i.subs.filter((x) => x.id !== s.id)))}>
                        <Icon name="trash" s />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small muted" style={{ padding: '10px 18px' }}>
        Ranges are costed at the midpoint until a firm price comes back. A request sends the supplier a private link where their price drops straight into this estimate.
      </div>
    </Card>
  );
}

function Settings({ est, locked }: { est: Estimate; locked: boolean }) {
  const editEstimate = useStore((s) => s.editEstimate);
  const set = (f: (e: Estimate) => void) => editEstimate(est.id, f);
  return (
    <Card className="mt16" title="Estimate settings" icon="gear" right={<span>Stored with this revision so it reprices the same way next year</span>}>
      <div className="param" style={{ marginTop: 14 }}>
        <div className="field">
          <label>Overhead %</label>
          <NumInput className="inp num" value={est.overheadPct} min={0} disabled={locked} onCommit={(v) => set((e) => void (e.overheadPct = v))} />
        </div>
        <div className="field">
          <label>Overhead charged on</label>
          <select className="inp" value={est.overheadBase} disabled={locked} onChange={(e) => set((x) => void (x.overheadBase = e.target.value as 'labour' | 'all'))}>
            <option value="labour">Labour only</option>
            <option value="all">All costs</option>
          </select>
        </div>
        <div className="field">
          <label>Waste allowance %</label>
          <NumInput className="inp num" value={est.wastePct} min={0} disabled={locked} onCommit={(v) => set((e) => void (e.wastePct = v))} />
        </div>
        <div className="field">
          <label>Lead time, weeks</label>
          <NumInput className="inp num" value={est.leadWeeks} min={1} disabled={locked} onCommit={(v) => set((e) => void (e.leadWeeks = v))} />
        </div>
        <div className="field">
          <label>Quote valid, days</label>
          <NumInput className="inp num" value={est.validDays} min={1} disabled={locked} onCommit={(v) => set((e) => void (e.validDays = v))} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>Payment schedule</label>
        <div className="chips">
          {est.schedule.map((s, i) => (
            <span key={i} className="chip">
              {s.label} <b className="num">{s.pct}%</b>
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SendDrawer({ open, onClose, projectId, blocking, total }: { open: boolean; onClose: () => void; projectId: string; blocking: number; total: number }) {
  const project = useProject(projectId)!;
  const client = useClient(project?.client);
  const est = useStore((s) => s.estimates.find((e) => e.projectId === projectId))!;
  const sendQuote = useStore((s) => s.sendQuote);
  return (
    <Drawer open={open} title="Send quote to client" onClose={onClose}>
      <p>
        A private link goes to <b>{client?.contact}</b> at {client?.email}. They can see the drawing, the price per item and the payment schedule, then approve and sign. The deposit invoice is raised in Xero the moment they do.
      </p>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <span className="muted">Quote total ex VAT</span>
          <span className="sp" />
          <span className="num" style={{ fontSize: 18 }}>
            {gbp(total)}
          </span>
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <span className="muted">Link</span>
          <span className="sp" />
          <span className="num">brackenburyhome.com/q/{est.token}</span>
        </div>
      </div>
      {blocking > 0 && (
        <div className="demo" style={{ marginTop: 14 }}>
          <Icon name="warning" s />
          {blocking} check{blocking === 1 ? '' : 's'} still open. You can send anyway; the director sees it flagged.
        </div>
      )}
      <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
        <Link className="btn" href={`/portal/${est.token}?preview=1`} onClick={onClose}>
          <Icon name="eye" s />
          Preview client view
        </Link>
        <button
          className="btn gold"
          onClick={() => {
            sendQuote(projectId);
            onClose();
          }}
        >
          <Icon name="paper-plane-tilt" s />
          Send quote
        </button>
      </div>
    </Drawer>
  );
}
