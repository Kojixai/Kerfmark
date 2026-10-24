'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon, SECTOR_ICON } from '@/components/Icon';
import { Card, Drawer, Kpi, Locked, useCan } from '@/components/ui';
import { DesignPicker } from '@/components/DesignPicker';
import { useStore, useProject, useClient } from '@/lib/store';
import { costEstimate, quoteLines } from '@/lib/estimate';
import { dshort, dt, dtime, gbp } from '@/lib/format';
import { STAGES } from '@/lib/types';

const NEXT: Record<number, { t: string; d: string; cta?: string }> = {
  0: { t: 'Price this enquiry', d: 'Drop in the drawing to extract parts, or start from a parametric design.', cta: 'Start estimate' },
  1: { t: 'Finish the estimate and send it', d: 'Clear the checks, set the margin, then send it through the client portal.' },
  2: { t: 'Waiting for the client to approve', d: 'Automatic follow-ups are scheduled. Open the portal as the client to approve and sign.' },
  3: { t: 'Deposit invoice sent', d: 'Xero marks it paid when the money lands. Simulate that here.', cta: 'Mark deposit paid' },
  4: { t: 'Workshop drawings for approval', d: 'Issue rev A through the portal and log comments until approved.', cta: 'Drawings approved' },
  5: { t: 'Samples for approval', d: 'Veneer, finish sheen and metalwork samples go out for sign-off.', cta: 'Samples approved' },
  6: { t: 'Ready for production', d: 'Issue the cutting list and sheet layouts to the workshop.', cta: 'Start production' },
  7: { t: 'In production', d: 'Workshop logs hours against parts. Mark delivered when it leaves.', cta: 'Mark delivered' },
  8: { t: 'Delivered', d: 'Install, snag, and get the client to sign off in the app.', cta: 'Installed and signed off' },
  9: { t: 'Raise the final invoice', d: 'Invoices the balance of the contract in Xero.', cta: 'Raise final invoice' },
  10: { t: 'Complete', d: 'Final invoice raised. Quoted against actual margin is in Finance.' },
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const p = useProject(id);
  const c = useClient(p?.client);
  const est = useStore((s) => s.estimates.find((e) => e.projectId === id));
  const prices = useStore((s) => s.prices);
  const rates = useStore((s) => s.rates);
  const allInvoices = useStore((s) => s.invoices);
  const allBills = useStore((s) => s.bills);
  const inbox = useStore((s) => s.inbox);
  const invoices = allInvoices.filter((i) => i.proj === id);
  const bills = allBills.filter((b) => b.proj === id);
  const mails = inbox.filter((m) => m.proj === id);
  const chase = useStore((s) => s.chases.find((h) => h.proj === id));
  const role = useStore((s) => s.role);
  const advance = useStore((s) => s.advance);
  const sendChase = useStore((s) => s.sendChase);
  const startEstimate = useStore((s) => s.startEstimate);
  const canPrice = useCan('prices');
  const canEstimate = useCan('estimate');
  const [starting, setStarting] = useState(false);
  const [file, setFile] = useState('');
  const router = useRouter();

  const cost = useMemo(() => (est ? costEstimate(est, prices, rates) : null), [est, prices, rates]);
  if (!p || !c) return <div className="empty">Project not found</div>;
  if ((role === 'fitter' || role === 'workshop') && p.nda) return <Locked what="This NDA project" />;

  const q = est && cost ? quoteLines(est, cost) : null;
  const value = p.stage <= 1 && q ? q.total : p.value;
  const invoiced = invoices.reduce((a, i) => a + i.amt, 0);
  const paid = invoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.amt, 0);
  const next = NEXT[p.stage];
  const quotedMargin = est?.margin;

  return (
    <div className="fade">
      <div className="pagehead">
        <div>
          <div className="muted small num row" style={{ gap: 6 }}>
            {p.id} · <Icon name={SECTOR_ICON[p.sector]} s /> {p.sector} · {p.contract === 'supply_and_fit' ? 'Supply and fit (CIS applies to fitting)' : 'Supply only'}
          </div>
          <h2 className="h2x">{p.title}</h2>
          <div className="muted">
            {c.name}, {c.city}. Project manager {p.pm}. Due {dt(p.due)}
          </div>
        </div>
        <span className="sp" />
        {est && (
          <Link className="btn" href={`/portal/${est.token}?preview=1`}>
            <Icon name="link" s />
            Client portal
          </Link>
        )}
        {est && est.items.some((i) => i.parts.length) && (
          <Link className="btn" href={`/projects/${id}/model`}>
            <Icon name="cube" s />
            3D and cutting list
          </Link>
        )}
        {est && canEstimate && (
          <Link className="btn dark" href={`/projects/${id}/estimate`}>
            <Icon name="calculator" s />
            Estimate
          </Link>
        )}
      </div>

      <div className="card">
        <div className="stages">
          {STAGES.map((s, i) => {
            const e = [...p.events].reverse().find((x) => i > 0 && x.text.toLowerCase().includes(['', 'estimate', 'quote qt', 'approved and signed', 'deposit', 'drawings', 'samples', 'production', 'delivered', 'installed', 'final invoice'][i]));
            return (
              <div key={s} className={`stage ${i < p.stage ? 'done' : i === p.stage ? 'now' : ''}`}>
                <div className="b" />
                <div className="n">{s}</div>
                <div className="dt">{i < p.stage && e ? dshort(e.at) : i === p.stage ? 'Now' : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {canEstimate && (
        <div className="next mt16">
          <div className="ico gold">
            <Icon name={p.stage >= 10 ? 'check-circle' : 'arrow-right'} s />
          </div>
          <div className="sp">
            <div className="t1">{next.t}</div>
            <div className="t2">{next.d}</div>
          </div>
          {p.stage === 0 && (
            <button className="btn dark" onClick={() => setStarting(true)}>
              <Icon name="calculator" s />
              Start estimate
            </button>
          )}
          {p.stage === 1 && est && (
            <Link className="btn dark" href={`/projects/${id}/estimate`}>
              <Icon name="calculator" s />
              Open estimator
            </Link>
          )}
          {p.stage === 1 && !est && (
            <button className="btn dark" onClick={() => setStarting(true)}>
              Start estimate
            </button>
          )}
          {p.stage === 2 && (
            <>
              {chase && (
                <button className="btn" onClick={() => sendChase(chase.id)}>
                  <Icon name="paper-plane-tilt" s />
                  Chase now
                </button>
              )}
              {est && (
                <Link className="btn gold" href={`/portal/${est.token}`}>
                  <Icon name="signature" s />
                  Approve as the client
                </Link>
              )}
            </>
          )}
          {p.stage >= 3 && p.stage < 10 && (
            <button className="btn dark" onClick={() => advance(id)}>
              <Icon name="check" s />
              {next.cta}
            </button>
          )}
        </div>
      )}

      <div className="grid g31 mt16">
        <div className="grid" style={{ alignContent: 'start' }}>
          {canPrice ? (
            <div className="grid g3">
              <Kpi l={p.stage <= 1 ? 'Estimate so far' : 'Contract value'} v={value ? gbp(value) : 'TBC'} d={est ? `${est.status === 'approved' ? 'Approved' : est.status === 'sent' ? 'Sent' : 'Draft'} rev ${est.rev}` : 'No estimate yet'} ic="file-text" />
              <Kpi l="Invoiced" v={gbp(invoiced)} d={`${gbp(paid)} paid`} ic="receipt" />
              <Kpi
                l="Margin"
                v={p.actualMargin != null ? `${p.actualMargin}%` : quotedMargin != null ? `${quotedMargin}%` : '-'}
                d={p.actualMargin != null ? `Quoted ${quotedMargin ?? 32}%${p.actualMargin < (quotedMargin ?? 32) ? ', leather cost up 11%' : ''}` : 'Quoted, before actuals'}
                ic="chart-line"
                cls={p.actualMargin != null && p.actualMargin < (quotedMargin ?? 32) ? 'down' : ''}
              />
            </div>
          ) : null}

          {est && q && canPrice && (
            <Card flush title="Quote" icon="calculator" right={<Link className="btn sm" href={`/projects/${id}/estimate`}>Open estimator <Icon name="arrow-right" s /></Link>}>
              <table className="t">
                <tbody>
                  {q.lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {l.name}
                          {l.qty > 1 ? ` x ${l.qty}` : ''}
                        </div>
                        <div className="small muted">{l.desc}</div>
                      </td>
                      <td className="r num">{gbp(l.price)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total ex VAT</td>
                    <td className="r num" style={{ fontWeight: 600 }}>
                      {gbp(q.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          )}

          <Card flush title="Activity" icon="clock">
            <div className="list">
              {[...p.events].reverse().map((e) => (
                <div className="it" key={e.id}>
                  <div className="ico">
                    <Icon name={e.icon} s />
                  </div>
                  <div className="sp">
                    <div className="t1">{e.text}</div>
                    <div className="t2 num">
                      {dtime(e.at)}
                      {e.who ? ` · ${e.who}` : ''}
                    </div>
                  </div>
                </div>
              ))}
              {!p.events.length && <div className="it muted">No activity yet</div>}
            </div>
          </Card>

          {canPrice && (
            <Card flush title="Invoices and bills (Xero)" icon="receipt">
              <div className="scroll-x">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>What</th>
                      <th className="r">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.ref}>
                        <td className="num">{i.ref}</td>
                        <td>{i.label ?? c.name}</td>
                        <td className="r num">{gbp(i.amt)}</td>
                        <td>
                          <span className={`pill ${i.status === 'Paid' ? 'p-green' : i.status === 'Overdue' ? 'p-red' : 'p-blue'}`}>{i.status}</span>
                        </td>
                      </tr>
                    ))}
                    {bills.map((b) => (
                      <tr key={b.ref}>
                        <td className="num">{b.ref}</td>
                        <td>
                          {b.sup} <span className="muted small">bill</span>
                        </td>
                        <td className="r num">{gbp(b.amt, 2)}</td>
                        <td>
                          <span className="pill p-grey">Due {dshort(b.due)}</span>
                        </td>
                      </tr>
                    ))}
                    {!invoices.length && !bills.length && (
                      <tr>
                        <td colSpan={4} className="muted">
                          Nothing synced for this project yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          {p.brief && (
            <Card title="Brief" icon="info">
              <p className="small" style={{ marginTop: 8 }}>
                {p.brief}
              </p>
            </Card>
          )}
          <Card title="Approvals" icon="signature">
            <div style={{ marginTop: 10 }}>
              {(
                [
                  ['Quote', 2],
                  ['Drawings', 4],
                  ['Samples', 5],
                  ['Delivery', 7],
                  ['Installation sign-off', 8],
                ] as [string, number][]
              ).map(([n, s]) => (
                <div key={n} className="row small" style={{ padding: '7px 0', borderBottom: '1px solid var(--line2)' }}>
                  <span>{n}</span>
                  <span className="sp" />
                  {p.stage > s ? <span className="pill p-green">Approved</span> : p.stage === s ? <span className="pill p-amber">Waiting</span> : <span className="pill p-grey">Later</span>}
                </div>
              ))}
              {est?.signature && (
                <div className="small muted" style={{ marginTop: 10 }}>
                  Quote signed by {est.signature.name}{est.signature.position ? `, ${est.signature.position}` : ''}, {dtime(est.signature.at)} from {est.signature.ip}
                </div>
              )}
            </div>
          </Card>
          <Card title="Emails" icon="envelope-simple">
            <div style={{ marginTop: 8 }}>
              {mails.map((m) => (
                <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line2)' }}>
                  <div className="small" style={{ fontWeight: 500 }}>
                    {m.subj}
                  </div>
                  <div className="muted small">
                    {m.from}, {m.dt}
                  </div>
                </div>
              ))}
              {!mails.length && <div className="muted small" style={{ paddingTop: 8 }}>All mail to and from {c.contact} is filed here automatically.</div>}
            </div>
          </Card>
          <Card title="Documents" icon="files">
            <div className="small" style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {p.documents.map((f) => (
                <div className="row" key={f.name}>
                  <Icon name="files" s />
                  <span className="sp">{f.name}</span>
                  <span className="muted">{f.kind}</span>
                </div>
              ))}
              {!p.documents.length && <span className="muted">No documents yet</span>}
            </div>
          </Card>
          {p.sector !== 'Residential' && (
            <Card title={p.sector === 'Marine' ? 'Yacht documentation pack' : 'Aircraft parts pack'} icon="shield-check">
              <div className="small" style={{ marginTop: 8, display: 'grid', gap: 7 }}>
                {(p.sector === 'Marine'
                  ? ['IMO FTP Code Part 8 foam and fabric certificates', 'Part 5 surface flammability for veneer and lacquer', 'Weight per piece', 'Export evidence for zero-rating']
                  : ['CS 25.853 burn test per build-up', 'Weight against monument budget', 'Certificate of conformity', 'Export evidence for zero-rating']
                ).map((x, i) => (
                  <div className="row" key={x}>
                    <span className={`tick ${i < (p.stage >= 6 ? 2 : 1) ? 'y' : 'n'}`}>{i < (p.stage >= 6 ? 2 : 1) ? <Icon name="check" s /> : '-'}</span>
                    {x}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Drawer open={starting} title={`Start the estimate for ${p.id}`} onClose={() => setStarting(false)}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Drawing (optional)</label>
          <label className="dropzone">
            <Icon name="upload-simple" />
            <span>{file || 'Choose the client drawing PDF'}</span>
            <span className="small">The prototype reads the file name and simulates extraction with confidence scores</span>
            <input type="file" accept=".pdf" hidden onChange={(e) => setFile(e.target.files?.[0]?.name ?? '')} />
          </label>
        </div>
        <DesignPicker
          cta={file ? 'Extract parts and start' : 'Start estimate'}
          defaultName={p.title}
          onDone={(spec, name) => {
            startEstimate(id, spec, name, file || undefined);
            setStarting(false);
            router.push(`/projects/${id}/estimate`);
          }}
        />
      </Drawer>
    </div>
  );
}
