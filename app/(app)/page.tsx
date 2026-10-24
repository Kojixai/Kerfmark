'use client';

import Link from 'next/link';
import { Icon, SECTOR_ICON } from '@/components/Icon';
import { Card, Due, HealthPill, Kpi, Locked, StageMini, useCan } from '@/components/ui';
import { useStore, liveValue } from '@/lib/store';
import { costEstimate } from '@/lib/estimate';
import { days, dshort, gbp, k } from '@/lib/format';
import { MONEY } from '@/lib/demo/reference';

const TOUR = [
  { id: 'P-2051', what: 'Being estimated from a client PDF', try: 'Clear the checks, drag the margin, change the width and watch the sheets, price and 3D follow. Then send it and approve it as the client.' },
  { id: 'P-2045', what: 'Aviation, approved, drawings signed off', try: 'Two items on honeycomb panel with fire-retardant finish. Walk it on through samples to production.' },
  { id: 'P-2043', what: 'Marine, samples approved, margin at risk', try: 'Four items including labour-only upholstery and shipping. Leather rose 11% after the quote.' },
];

function MoneyChart() {
  const W = 360,
    H = 150,
    m = MONEY,
    max = Math.max(...m.in, ...m.out),
    bw = W / 12;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 18}`}>
      {m.months.map((mo, i) => (
        <g key={mo}>
          <rect x={i * bw + 3} y={H - (m.in[i] / max) * H} width={bw / 2 - 3} height={(m.in[i] / max) * H} fill="var(--ink)" rx="2" />
          <rect x={i * bw + bw / 2} y={H - (m.out[i] / max) * H} width={bw / 2 - 3} height={(m.out[i] / max) * H} fill="var(--gold)" rx="2" />
          <text x={i * bw + bw / 2} y={H + 13} textAnchor="middle">
            {mo[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Overview() {
  const s = useStore();
  const canMoney = useCan('xero');
  if (!canMoney) return <Locked what="The business overview" />;

  const client = (id: string) => s.clients.find((c) => c.id === id)!;
  const quotes = s.projects.filter((p) => p.stage === 2);
  const live = s.projects.filter((p) => p.stage >= 3 && p.stage < 10);
  const estimating = s.projects.filter((p) => p.stage <= 1);
  const overdue = s.invoices.filter((i) => i.status === 'Overdue');
  const compDue = s.compliance.filter((c) => days(c.next) <= 14).sort((a, b) => days(a.next) - days(b.next));
  const bySec: Record<string, number> = {};
  s.clients.forEach((c) => (bySec[c.sector] = (bySec[c.sector] ?? 0) + c.rev));
  const tot = Object.values(bySec).reduce((a, b) => a + b, 0);
  const deposits = s.invoices.filter((i) => i.status === 'Paid' && /deposit/i.test(i.label ?? '')).reduce((a, i) => a + i.amt, 0);

  return (
    <div className="fade">
      <div className="demo">
        <Icon name="warning" s />
        Demo data. Every client, person and figure is invented except Brackenbury&apos;s own company details. Changes are saved in this browser only.
      </div>
      <div className="grid g4">
        <Kpi l="Cash at bank (Xero)" v={k(MONEY.bank)} d="Synced 08:02 today" ic="bank" />
        <Kpi l="Quotes out" v={k(quotes.reduce((a, p) => a + p.value, 0))} d={`${quotes.length} sent, ${s.chases.filter((c) => quotes.some((q) => q.id === c.proj)).length} being chased`} ic="file-text" />
        <Kpi l="Work in progress" v={k(live.reduce((a, p) => a + p.value, 0))} d={`${live.length} live projects, ${k(deposits)} deposits held`} ic="hammer" />
        <Kpi l="Overdue invoices" v={k(overdue.reduce((a, i) => a + i.amt, 0))} d={overdue.length ? `${overdue.length} invoice${overdue.length > 1 ? 's' : ''}, oldest ${Math.max(...overdue.map((i) => -days(i.due)))} days late` : 'None'} ic="receipt" cls={overdue.length ? 'down' : ''} />
      </div>

      <Card className="mt16" title="Three worked projects to try" icon="sparkle" right={<span>Each one walks from enquiry to final invoice</span>}>
        <div className="grid g3" style={{ marginTop: 12 }}>
          {TOUR.map((t) => {
            const p = s.projects.find((x) => x.id === t.id);
            if (!p) return null;
            const est = s.estimates.find((e) => e.projectId === p.id);
            const checks = est ? costEstimate(est, s.prices, s.rates).checks.length : 0;
            return (
              <div key={t.id} className="card" style={{ background: 'var(--panel2)' }}>
                <div className="row small muted">
                  <Icon name={SECTOR_ICON[p.sector]} s />
                  {p.id} · {p.sector}
                  <span className="sp" />
                  <span className="num">{liveValue(s, p) ? gbp(liveValue(s, p)) : ''}</span>
                </div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>{p.title}</div>
                <div className="small" style={{ marginTop: 2 }}>
                  {t.what}
                </div>
                <div className="small muted" style={{ marginTop: 8 }}>
                  {t.try}
                </div>
                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
                  <Link className="btn sm dark" href={p.stage <= 1 ? `/projects/${p.id}/estimate` : `/projects/${p.id}`}>
                    {p.stage <= 1 ? 'Open estimator' : 'Open project'}
                    <Icon name="arrow-right" s />
                  </Link>
                  <Link className="btn sm" href={`/projects/${p.id}/model`}>
                    <Icon name="cube" s />
                    3D
                  </Link>
                  <span className="sp" />
                  {p.stage <= 1 && checks > 0 && <span className="pill p-amber">{checks} checks</span>}
                  {p.stage > 1 && <span className="small muted">{['', '', 'Quote sent', 'Approved', 'Deposit paid', 'Drawings approved', 'Samples approved', 'In production', 'Delivered', 'Installed', 'Done'][p.stage]}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid g21 mt16">
        <Card flush title="Projects" icon="kanban" right={<Link className="btn sm" href="/pipeline">Open pipeline <Icon name="arrow-right" s /></Link>}>
          <div className="scroll-x">
            <table className="t" id="ovt">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th className="r">Value</th>
                  <th>Due</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {[...live, ...quotes, ...estimating].map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={p.stage <= 1 && p.estimateId ? `/projects/${p.id}/estimate` : `/projects/${p.id}`} style={{ fontWeight: 500 }}>
                        {p.title}
                      </Link>
                      <div className="muted small num">{p.id}</div>
                    </td>
                    <td>{client(p.client).name}</td>
                    <td>
                      <StageMini s={p.stage} />
                    </td>
                    <td className="r num">{liveValue(s, p) ? gbp(liveValue(s, p)) : 'TBC'}</td>
                    <td className="num small">{dshort(p.due)}</td>
                    <td>
                      <HealthPill h={p.health} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card flush title="Chase queue" icon="paper-plane-tilt" right={<span className="pill p-gold">{s.chases.filter((c) => c.auto).length} automatic</span>}>
            <div className="list">
              {s.chases.map((c) => {
                const p = s.projects.find((x) => x.id === c.proj);
                return (
                  <div className="it" key={c.id}>
                    <div className={`ico ${days(c.next) <= 0 ? 'red' : 'amber'}`}>
                      <Icon name="clock" s />
                    </div>
                    <div className="sp">
                      <Link className="t1" href={`/projects/${c.proj}`}>
                        {p?.title}
                      </Link>
                      <div className="t2">
                        {c.what}. Chase {c.n + 1} {c.auto ? 'sends' : 'due'} {days(c.next) <= 0 ? 'today' : dshort(c.next)}
                      </div>
                    </div>
                    <button className="btn sm" onClick={() => s.sendChase(c.id)}>
                      Send now
                    </button>
                  </div>
                );
              })}
              {!s.chases.length && <div className="it muted">Nothing to chase</div>}
            </div>
          </Card>
          <Card flush title="Compliance, next 14 days" icon="shield-check" right={<Link className="btn sm" href="/compliance">All</Link>}>
            <div className="list">
              {compDue.slice(0, 5).map((c) => (
                <div className="it" key={c.id}>
                  <div className="sp">
                    <div className="t1">{c.n}</div>
                    <div className="t2">{c.basis}</div>
                  </div>
                  <Due d={c.next} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid g2 mt16">
        <Card title="Money in and out" icon="chart-line" right={<span>£k, last 12 months</span>}>
          <MoneyChart />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <i style={{ background: 'var(--ink)' }} />
              In
            </span>
            <span>
              <i style={{ background: 'var(--gold)' }} />
              Out
            </span>
          </div>
        </Card>
        <Card title="Revenue by sector" icon="buildings" right={<span>all time</span>}>
          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            {Object.entries(bySec)
              .sort((a, b) => b[1] - a[1])
              .map(([sec, v]) => (
                <div key={sec}>
                  <div className="row small">
                    <Icon name={SECTOR_ICON[sec]} s />
                    <span>{sec}</span>
                    <span className="sp" />
                    <span className="num">{k(v)}</span>
                    <span className="muted num">{Math.round((v / tot) * 100)}%</span>
                  </div>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <i style={{ width: `${(v / tot) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
          <h2 style={{ marginTop: 20 }}>Top clients</h2>
          <div style={{ marginTop: 8 }}>
            {[...s.clients]
              .sort((a, b) => b.rev - a.rev)
              .slice(0, 4)
              .map((c) => (
                <div className="row small" style={{ padding: '5px 0' }} key={c.id}>
                  <span>{c.name}</span>
                  <span className="sp" />
                  <span className="num">{k(c.rev)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
