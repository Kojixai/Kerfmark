'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Due, Kpi, Locked, useCan } from '@/components/ui';
import { STAFF } from '@/lib/demo/reference';
import { dt, gbp, ini, TODAY } from '@/lib/format';

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const canPay = useCan('pay');
  const s = STAFF.find((x) => x.id === id);

  if (!s)
    return (
      <div className="card empty">
        Person not found.{' '}
        <Link className="btn sm" href="/people">
          Back to people
        </Link>
      </div>
    );

  const yrs = ((TODAY.getTime() - new Date(s.start).getTime()) / 3.156e10).toFixed(1);
  const pay = [0, 1, 2, 3, 4, 5].map((i) => ({ d: new Date(2026, 8 - i, 28), g: s.salary / 12, n: (s.salary / 12) * 0.74 }));
  const machines = Object.entries(s.training);

  return (
    <div className="fade">
      <Link className="btn sm" href="/people" style={{ marginBottom: 14 }}>
        <Icon name="arrow-left" s />
        Back to people
      </Link>
      <div className="card">
        <div className="prof" style={{ flexWrap: 'wrap' }}>
          <div className="av" style={{ background: s.col }}>
            {ini(s.name)}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>{s.name}</h2>
            <div className="muted">
              {s.role}, {s.dept}. Joined {dt(s.start)} ({yrs} years)
            </div>
          </div>
          {canPay && (
            <span className="pill p-gold">
              <Icon name="lock-key" s />
              Director only
            </span>
          )}
        </div>
      </div>

      {canPay ? (
        <div className="grid g4 mt16">
          <Kpi l="Salary" v={gbp(s.salary)} d={`Last rise ${dt(s.lastRise)}, +${s.risePct}%`} ic="currency-gbp" />
          <Kpi l="September pay" v="Paid" d="28 Sep 2026 via Xero Payroll" ic="check-circle" cls="up" />
          <Kpi l="Holiday" v={`${s.holiday.used} of ${s.holiday.total} days`} d="Year to 31 Dec" ic="calendar-blank" />
          <Kpi l="Right to work" v="Checked" d={`${dt(s.rtw)}. Keep copy to 2 years after leaving`} ic="identification-card" />
        </div>
      ) : (
        <div className="mt16">
          <Locked what="Pay and HR records" />
        </div>
      )}

      <div className="grid g2 mt16">
        <div className="card flush">
          <div className="hd">
            <h2>
              <Icon name="graduation-cap" s />
              Certificates and training
            </h2>
          </div>
          <div className="scroll-x">
            <table className="t">
              <tbody>
                {s.certs.length === 0 && (
                  <tr>
                    <td className="muted">No certificates needed for this role</td>
                  </tr>
                )}
                {s.certs.map((c) => (
                  <tr key={c.n}>
                    <td>{c.n}</td>
                    <td>
                      <Due d={c.exp} />
                    </td>
                    <td className="r num small">{dt(c.exp)}</td>
                  </tr>
                ))}
                {machines.length > 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="small muted" style={{ marginBottom: 6 }}>
                        Machines signed off
                      </div>
                      {machines.map(([m, v]) => (
                        <span key={m} className={`pill ${v === 'y' ? 'p-green' : v === 's' ? 'p-amber' : 'p-grey'}`} style={{ margin: '0 4px 4px 0' }}>
                          {m}
                          {v === 's' ? ' (supervised)' : v === 'n' ? ' (not trained)' : ''}
                        </span>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card flush">
          <div className="hd" style={{ flexWrap: 'wrap' }}>
            <h2>
              <Icon name="heartbeat" s />
              Health surveillance
            </h2>
            <span className="muted small">COSHH reg 11, Noise at Work</span>
          </div>
          <table className="t">
            <tbody>
              {s.health.length === 0 && (
                <tr>
                  <td className="muted">Not exposed. No surveillance needed</td>
                </tr>
              )}
              {s.health.map((h) => (
                <tr key={h.n}>
                  <td>{h.n}</td>
                  <td className="r">
                    <Due d={h.due} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canPay ? (
          <>
            <div className="card flush">
              <div className="hd">
                <h2>
                  <Icon name="receipt" s />
                  Payslips (Xero Payroll, read only)
                </h2>
              </div>
              <div className="scroll-x">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Pay date</th>
                      <th className="r">Gross</th>
                      <th className="r">Net (est.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pay.map((p) => (
                      <tr key={p.d.toISOString()}>
                        <td className="num">{dt(p.d)}</td>
                        <td className="r num">{gbp(p.g, 2)}</td>
                        <td className="r num">{gbp(p.n, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h2>
                <Icon name="hammer" s />
                Cost to jobs
              </h2>
              <p className="muted small" style={{ marginTop: 8 }}>
                Hourly cost including employer NI and pension, used in every estimate.
              </p>
              <div className="kpi" style={{ padding: '12px 0 0' }}>
                <div className="v">{gbp((s.salary * 1.19) / 1650, 2)}/hr</div>
              </div>
              <div className="small" style={{ marginTop: 10 }}>
                Logged this month: <span className="num">118h</span> across P-2041 and P-2043
              </div>
            </div>
          </>
        ) : (
          <Locked what="Pay and HR records" />
        )}
      </div>
    </div>
  );
}
