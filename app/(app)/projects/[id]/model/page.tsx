'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Viewer3D } from '@/components/Viewer3D';
import { useCan } from '@/components/ui';
import { useStore, useProject } from '@/lib/store';
import { cutDims } from '@/lib/estimate';

function Model() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const project = useProject(id);
  const est = useStore((s) => s.estimates.find((e) => e.projectId === id));
  const prices = useStore((s) => s.prices);
  const nda = useStore((s) => s.role === 'workshop' || s.role === 'fitter');
  const canEstimate = useCan('estimate');
  const withParts = est?.items.filter((i) => i.parts.length) ?? [];
  const [itemId, setItemId] = useState(q.get('item') ?? withParts[0]?.id);
  const [sel, setSel] = useState<string | null>(q.get('part'));
  const item = withParts.find((i) => i.id === itemId) ?? withParts[0];

  useEffect(() => {
    if (sel) document.querySelector(`[data-part="${sel}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel]);

  if (!project) return <div className="empty">Project not found</div>;
  if (!item)
    return (
      <div className="card empty">
        No cutting list yet for {project.title}.{' '}
        {canEstimate && (
          <Link className="btn sm dark" href={`/projects/${id}/estimate`}>
            Open the estimate
          </Link>
        )}
      </div>
    );
  const p = item.parts.find((x) => x.id === sel);
  const title = project.nda && nda ? project.codename ?? 'NDA project' : project.title;

  return (
    <div className="fade">
      <div className="pagehead">
        <div>
          <div className="muted small num">{project.id}</div>
          <h2 className="h2x">
            {item.name}, built from the cutting list
          </h2>
          <div className="muted">{title}. Drag to turn, scroll or pinch to zoom, tap a part to find it in the list.</div>
        </div>
        <span className="sp" />
        {canEstimate && (
          <Link className="btn" href={`/projects/${id}/estimate`}>
            <Icon name="calculator" s />
            Estimate
          </Link>
        )}
      </div>
      {withParts.length > 1 && (
        <div className="itemtabs">
          {withParts.map((it) => (
            <button key={it.id} className={`itemtab ${it.id === item.id ? 'on' : ''}`} onClick={() => { setItemId(it.id); setSel(null); }}>
              <div className="n">{it.name}</div>
              <div className="v">{it.parts.length} parts</div>
            </button>
          ))}
        </div>
      )}
      <div className="grid g31">
        <div style={{ position: 'relative' }}>
          <Viewer3D parts={item.parts} selected={sel} onPick={setSel} />
          {p && (
            <div className="viewer-tip">
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div className="num" style={{ marginTop: 4 }}>
                {cutDims(p).map(Math.round).join(' x ')} mm
              </div>
              <div className="muted" style={{ marginTop: 2 }}>
                {prices.find((x) => x.sku === p.sku)?.d.split(',')[0] ?? p.sku}
              </div>
              <div className="muted">
                Grain {p.grain}
                {p.edge ? ` · edging ${p.edge.toFixed(2)}m` : ''}
                {p.qty > 1 ? ` · qty ${p.qty}` : ''}
              </div>
            </div>
          )}
        </div>
        <div className="card flush" style={{ maxHeight: 520, overflow: 'auto' }}>
          <div className="hd">
            <h2>
              <Icon name="list-checks" s />
              Parts
            </h2>
            <span className="muted small">{item.parts.length}</span>
          </div>
          <table className="t">
            <tbody>
              {item.parts.map((x, i) => (
                <tr key={x.id} data-part={x.id} className={`click ${sel === x.id ? 'sel' : ''}`} onClick={() => setSel(sel === x.id ? null : x.id)}>
                  <td className="num muted tight">{i + 1}</td>
                  <td>
                    {x.name}
                    <div className="muted small num">{cutDims(x).map(Math.round).join(' x ')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ModelPage() {
  return (
    <Suspense>
      <Model />
    </Suspense>
  );
}
