'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Card, Kpi, Locked, useCan } from '@/components/ui';
import { useStore } from '@/lib/store';
import { MONEY } from '@/lib/demo/reference';
import { dshort, gbp } from '@/lib/format';
import type { Invoice } from '@/lib/types';

const STATUS: Record<Invoice['status'], string> = { Paid: 'p-green', Overdue: 'p-red', Sent: 'p-blue', Draft: 'p-grey' };

function MoneyChart() {
  const W = 360;
  const H = 150;
  const max = Math.max(...MONEY.in, ...MONEY.out);
  const bw = W / 12;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label="Money in and out by month, thousands of pounds">
      {MONEY.in.map((v, i) => (
        <g key={MONEY.months[i]}>
          <rect x={i * bw + 3} y={H - (v / max) * H} width={bw / 2 - 3} height={(v / max) * H} rx={2} fill="var(--ink)">
            <title>{`${MONEY.months[i]} in £${v}k`}</title>
          </rect>
          <rect x={i * bw + bw / 2} y={H - (MONEY.out[i] / max) * H} width={bw / 2 - 3} height={(MONEY.out[i] / max) * H} rx={2} fill="var(--gold)">
            <title>{`${MONEY.months[i]} out £${MONEY.out[i]}k`}</title>
          </rect>
          <text x={i * bw + bw / 2} y={H + 12} textAnchor="middle">
            {MONEY.months[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function FinancePage() {
  const canXero = useCan('xero');
  const invoices = useStore((s) => s.invoices);
  const bills = useStore((s) => s.bills);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const estimates = useStore((s) => s.estimates);

  if (!canXero) return <Locked what="Xero and bank data" />;

  const owed = invoices.filter((i) => i.status !== 'Paid');
  const last = MONEY.in.length - 1;
  const net = MONEY.in[last] - MONEY.out[last];
  const jobs = projects
    .filter((p) => p.actualMargin != null)
    .map((p) => {
      const e = p.estimateId ? estimates.find((x) => x.id === p.estimateId) : undefined;
      return { p, q: e?.margin ?? 32, a: p.actualMargin ?? 0 };
    });

  return (
    <div className="fade">
      <div className="demo">
        <Icon name="bank" s />
        Read from Xero every 15 minutes: bank, invoices and bills. Xero stays the accounting record.
      </div>
      <div className="grid g4">
        <Kpi l="Bank balance" v={gbp(MONEY.bank)} d="Business current account" ic="bank" />
        <Kpi l="Owed to us" v={gbp(owed.reduce((a, i) => a + i.amt, 0))} d={`${owed.length} invoice${owed.length === 1 ? '' : 's'}`} ic="receipt" />
        <Kpi l="We owe" v={gbp(bills.reduce((a, b) => a + b.amt, 0), 2)} d={`${bills.length} supplier bills`} ic="storefront" />
        <Kpi
          l="October so far"
          v={`${net >= 0 ? '+' : '-'}£${Math.abs(net).toFixed(1)}k`}
          d={`In £${MONEY.in[last]}k, out £${MONEY.out[last]}k`}
          ic="chart-line"
          cls={net >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid g2 mt16">
        <div className="card flush">
          <div className="hd">
            <h2>
              <Icon name="receipt" s />
              Sales invoices
            </h2>
          </div>
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Client</th>
                  <th className="r">Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.ref}>
                    <td className="num">
                      {i.ref}
                      {i.label && <div className="muted small">{i.label}</div>}
                    </td>
                    <td>
                      {clients.find((c) => c.id === i.client)?.name ?? i.client}
                      <div className="muted small num">
                        <Link href={`/projects/${i.proj}`}>{i.proj}</Link>
                      </div>
                    </td>
                    <td className="r num">{gbp(i.amt)}</td>
                    <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                      {dshort(i.due)}
                    </td>
                    <td>
                      <span className={`pill ${STATUS[i.status]}`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card flush">
          <div className="hd">
            <h2>
              <Icon name="storefront" s />
              Supplier bills, linked to jobs
            </h2>
          </div>
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Job</th>
                  <th className="r">Amount</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.ref}>
                    <td>
                      {b.sup}
                      <div className="muted small num">{b.ref}</div>
                    </td>
                    <td className="num small">
                      <Link href={`/projects/${b.proj}`}>{b.proj}</Link>
                    </td>
                    <td className="r num">{gbp(b.amt, 2)}</td>
                    <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                      {dshort(b.due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid g12 mt16">
        <Card title="Money in and out" icon="bank" right={<span className="num">£k</span>}>
          <div className="legend" style={{ margin: '10px 0' }}>
            <span>
              <i style={{ background: 'var(--ink)' }} />
              In
            </span>
            <span>
              <i style={{ background: 'var(--gold)' }} />
              Out
            </span>
          </div>
          <MoneyChart />
        </Card>
        <Card title="Job profitability" icon="chart-line" right="quoted margin against actual">
          <div className="scroll-x">
            <table className="t" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="r">Value</th>
                  <th className="r">Quoted</th>
                  <th className="r">Actual so far</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(({ p, q, a }) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/projects/${p.id}`} style={{ fontWeight: 500 }}>
                        {p.title}
                      </Link>
                      <div className="muted small num">{p.id}</div>
                    </td>
                    <td className="r num">{gbp(p.value)}</td>
                    <td className="r num">{q}%</td>
                    <td className="r num">{a}%</td>
                    <td>
                      <span className={`pill ${a >= q ? 'p-green' : 'p-red'}`}>
                        {a >= q ? '+' : ''}
                        {(a - q).toFixed(1)} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
