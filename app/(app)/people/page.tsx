'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/ui';
import { MACHINES, STAFF } from '@/lib/demo/reference';
import { days, ini } from '@/lib/format';

function TrainingTick({ v }: { v?: 'y' | 's' | 'n' }) {
  if (v === 'y')
    return (
      <span className="tick y" title="Trained and signed off">
        <Icon name="check-circle" s />
      </span>
    );
  if (v === 's')
    return (
      <span className="tick s" title="Supervised only">
        S
      </span>
    );
  return (
    <span className="tick n" title="Not trained">
      -
    </span>
  );
}

export default function PeoplePage() {
  const canPay = useCan('pay');
  const trained = STAFF.filter((s) => Object.keys(s.training).length);

  return (
    <div className="fade">
      <div className="grid g3">
        {STAFF.map((s) => {
          const soon = s.certs.filter((c) => days(c.exp) < 60).length + s.health.filter((h) => days(h.due) < 30).length;
          return (
            <Link key={s.id} className="card fade" href={`/people/${s.id}`}>
              <div className="prof">
                <div className="av" style={{ background: s.col }}>
                  {ini(s.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="muted small">{s.role}</div>
                </div>
                <span className="sp" />
                {soon ? <span className="pill p-amber">{soon} due</span> : <span className="pill p-green">All current</span>}
              </div>
              <div className="row small" style={{ marginTop: 14 }}>
                {canPay ? (
                  <>
                    <span className="muted">Paid</span>
                    <span>28 Sep</span>
                  </>
                ) : (
                  <>
                    <span className="muted">Dept</span>
                    <span>{s.dept}</span>
                  </>
                )}
                <span className="sp" />
                <span className="muted">Holiday left</span>
                <span className="num">{s.holiday.total - s.holiday.used}d</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card flush mt16">
        <div className="hd" style={{ flexWrap: 'wrap' }}>
          <h2>
            <Icon name="graduation-cap" s />
            Machine training matrix
          </h2>
          <span className="muted small">PUWER and HSE L114: each operator trained and signed off per machine</span>
        </div>
        <div className="scroll-x">
          <table className="t matrix">
            <thead>
              <tr>
                <th>Person</th>
                {MACHINES.map((m) => (
                  <th key={m} className="c" style={{ textAlign: 'center' }}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trained.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link href={`/people/${s.id}`}>{s.name}</Link>
                  </td>
                  {MACHINES.map((m) => (
                    <td key={m} className="c">
                      <TrainingTick v={s.training[m]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
