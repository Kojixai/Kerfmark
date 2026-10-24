'use client';

import Link from 'next/link';
import { Icon, SECTOR_ICON } from '@/components/Icon';
import { Card, StageMini } from '@/components/ui';
import { useStore } from '@/lib/store';
import { cutDims } from '@/lib/estimate';
import { dshort } from '@/lib/format';

// Fitters only see the jobs they're assigned to install.
const FITTER_JOBS = ['P-2041', 'P-2043', 'P-2039'];

/** What the workshop sees: jobs, cutting lists and the 3D model. No client names on NDA work, no prices anywhere. */
export default function Workshop() {
  const s = useStore();
  const staffView = s.role === 'workshop' || s.role === 'fitter';
  const jobs = s.projects
    .filter((p) => p.stage >= 1 && p.stage < 10)
    .filter((p) => (s.role === 'fitter' ? FITTER_JOBS.includes(p.id) : true))
    .sort((a, b) => b.stage - a.stage);

  return (
    <div className="fade">
      <div className="demo">
        <Icon name="lock-key" s />
        Workshop view: parts, sizes, materials and grain. No prices or margins are sent to this screen{staffView ? '' : ' (switch role to Workshop to see it as they do)'}.
      </div>
      <div className="grid g2">
        {jobs.map((p) => {
          const est = s.estimates.find((e) => e.projectId === p.id);
          const parts = est?.items.flatMap((i) => i.parts.map((pt) => ({ ...pt, item: i.name, n: pt.qty * i.qty }))) ?? [];
          const name = p.nda && staffView ? p.codename ?? 'NDA project' : p.title;
          const sheets = new Set(parts.map((x) => x.sku)).size;
          return (
            <Card key={p.id} title={name} icon={SECTOR_ICON[p.sector]} right={<span className="num">{p.id}</span>}>
              <div className="row small" style={{ marginTop: 10 }}>
                <StageMini s={p.stage} />
                <span className="sp" />
                <span className="muted">Due {dshort(p.due)}</span>
              </div>
              {parts.length ? (
                <>
                  <div className="small muted" style={{ marginTop: 10 }}>
                    {parts.length} parts across {est!.items.length} item{est!.items.length > 1 ? 's' : ''}, {sheets} materials
                  </div>
                  <table className="t" style={{ marginTop: 8 }}>
                    <tbody>
                      {parts.slice(0, 5).map((pt) => (
                        <tr key={pt.item + pt.id}>
                          <td className="small">
                            {pt.name}
                            <div className="muted">{pt.item}</div>
                          </td>
                          <td className="small num">{cutDims(pt).map(Math.round).join(' x ')}</td>
                          <td className="small num">{pt.sku}</td>
                          <td className="r small num">x{pt.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="row" style={{ marginTop: 12 }}>
                    <Link className="btn sm dark" href={`/projects/${p.id}/model`}>
                      <Icon name="cube" s />
                      3D and full cutting list
                    </Link>
                    <span className="sp" />
                    {parts.length > 5 && <span className="small muted">+{parts.length - 5} more parts</span>}
                  </div>
                </>
              ) : (
                <p className="small muted" style={{ marginTop: 10 }}>
                  Cutting list not issued yet.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
