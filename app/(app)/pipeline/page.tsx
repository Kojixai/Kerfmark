'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, SECTOR_ICON } from '@/components/Icon';
import { HealthPill, StageMini, useCan } from '@/components/ui';
import { NewEnquiry } from '@/components/NewEnquiry';
import { useStore, liveValue } from '@/lib/store';
import { dshort, k } from '@/lib/format';
import { STAGES } from '@/lib/types';

const COLS: [string, number[]][] = [
  ['New enquiries', [0]],
  ['Estimating', [1]],
  ['Quote sent', [2]],
  ['Approved and deposit', [3, 4]],
  ['Design and samples', [5, 6]],
  ['Production to install', [7, 8, 9]],
  ['Final invoice', [10]],
];

// Fitters only see the jobs they're assigned to install.
const FITTER_JOBS = ['P-2041', 'P-2043', 'P-2039'];

export default function Pipeline() {
  const s = useStore();
  const canPrice = useCan('prices');
  const canEstimate = useCan('estimate');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const projects = s.projects.filter((p) => (s.role === 'fitter' ? FITTER_JOBS.includes(p.id) : true));
  const client = (id: string) => s.clients.find((c) => c.id === id)!;
  const title = (p: (typeof projects)[number]) => (p.nda && !canPrice ? p.codename ?? 'NDA project' : p.title);
  const href = (p: (typeof projects)[number]) => (p.stage === 1 && canEstimate ? `/projects/${p.id}/estimate` : `/projects/${p.id}`);

  return (
    <div className="fade">
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="seg">
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>
            Board
          </button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            List
          </button>
        </div>
        <span className="sp" />
        {canEstimate && (
          <button className="btn dark" onClick={() => setAdding(true)}>
            <Icon name="plus" s />
            New enquiry
          </button>
        )}
      </div>
      {view === 'board' ? (
        <div className="kan" style={{ gridTemplateColumns: `repeat(${COLS.length}, minmax(220px, 1fr))` }}>
          {COLS.map(([n, ss]) => {
            const ps = projects.filter((p) => ss.includes(p.stage));
            return (
              <div className="col" key={n}>
                <h3>
                  {n}
                  <span>{ps.length}</span>
                </h3>
                {ps.map((p) => {
                  const v = liveValue(s, p);
                  return (
                    <Link key={p.id} href={href(p)} className="kc fade" style={{ display: 'block' }}>
                      <div className="ref">{p.id}</div>
                      <div className="ti">{title(p)}</div>
                      <div className="ft">
                        <Icon name={SECTOR_ICON[p.sector]} s />
                        <span>{canPrice ? client(p.client).name : p.sector}</span>
                        <span className="sp" />
                        {canPrice && <span className="num">{v ? k(v) : 'TBC'}</span>}
                      </div>
                      <div className="ft" style={{ marginTop: 8 }}>
                        <HealthPill h={p.health} />
                        <span className="sp" />
                        <span>{STAGES[p.stage]}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flush">
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Stage</th>
                  {canPrice && <th className="r">Value</th>}
                  <th>Due</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="click" onClick={() => router.push(href(p))}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{title(p)}</div>
                      <div className="muted small num">{p.id}</div>
                    </td>
                    <td>{canPrice ? client(p.client).name : p.sector}</td>
                    <td>
                      <StageMini s={p.stage} />
                    </td>
                    {canPrice && <td className="r num">{liveValue(s, p) ? k(liveValue(s, p)) : 'TBC'}</td>}
                    <td className="num small">{dshort(p.due)}</td>
                    <td>
                      <HealthPill h={p.health} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <NewEnquiry open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
