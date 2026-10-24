'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Card, Locked, useCan } from '@/components/ui';
import { NewEnquiry } from '@/components/NewEnquiry';
import { useStore } from '@/lib/store';
import { costEstimate, quoteLines } from '@/lib/estimate';
import { dt, gbp } from '@/lib/format';

export default function Estimates() {
  const s = useStore();
  const canEstimate = useCan('estimate');
  const [adding, setAdding] = useState(false);
  if (!canEstimate) return <Locked what="Estimating" />;
  const rows = s.estimates.map((e) => {
    const c = costEstimate(e, s.prices, s.rates);
    const p = s.projects.find((x) => x.id === e.projectId)!;
    return { e, p, c, total: quoteLines(e, c).total, client: s.clients.find((x) => x.id === p.client)! };
  });
  const enquiries = s.projects.filter((p) => p.stage === 0 && !p.estimateId);

  return (
    <div className="fade">
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="muted small">Every estimate keeps its revision, margin, overhead basis and price book snapshot.</span>
        <span className="sp" />
        <button className="btn dark" onClick={() => setAdding(true)}>
          <Icon name="plus" s />
          New enquiry
        </button>
      </div>
      <div className="card flush">
        <div className="scroll-x">
          <table className="t">
            <thead>
              <tr>
                <th>Estimate</th>
                <th>Client</th>
                <th>Items</th>
                <th>Status</th>
                <th className="r">Cost</th>
                <th className="r">Margin</th>
                <th className="r">Quote</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, p, c, total, client }) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/projects/${p.id}/estimate`} style={{ fontWeight: 500 }}>
                      {p.title}
                    </Link>
                    <div className="muted small num">
                      {e.id} rev {e.rev}
                    </div>
                  </td>
                  <td className="small">{client.name}</td>
                  <td className="small">{e.items.map((i) => i.name).join(', ')}</td>
                  <td>
                    {e.status === 'approved' ? <span className="pill p-green">Approved {e.approvedAt ? dt(e.approvedAt) : ''}</span> : e.status === 'sent' ? <span className="pill p-blue">Sent</span> : <span className="pill p-grey">Draft</span>}
                  </td>
                  <td className="r num">{gbp(c.cost)}</td>
                  <td className="r num">{e.margin}%</td>
                  <td className="r num" style={{ fontWeight: 600 }}>
                    {gbp(total)}
                  </td>
                  <td>{e.status === 'draft' ? c.checks.length ? <span className="pill p-amber">{c.checks.length} open</span> : <span className="pill p-green">Clear</span> : <span className="muted small">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {enquiries.length > 0 && (
        <Card flush className="mt16" title="Enquiries waiting for a price" icon="envelope-simple">
          <div className="list">
            {enquiries.map((p) => (
              <div className="it" key={p.id}>
                <div className="sp">
                  <div className="t1">{p.title}</div>
                  <div className="t2">
                    {s.clients.find((c) => c.id === p.client)?.name} · {p.id}
                  </div>
                </div>
                <Link className="btn sm dark" href={`/projects/${p.id}`}>
                  Price it
                  <Icon name="arrow-right" s />
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
      <NewEnquiry open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
