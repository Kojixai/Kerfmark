'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { Icon, SECTOR_ICON } from '@/components/Icon';
import { Drawer, Kpi, Locked, useCan } from '@/components/ui';
import { useStore } from '@/lib/store';
import { k } from '@/lib/format';
import { STAGES, type Client } from '@/lib/types';

const W = 800;
const H = 840;
const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const proj = geoMercator().fitExtent(
  [
    [10, 10],
    [W - 10, H - 10],
  ],
  {
    type: 'MultiPoint',
    coordinates: [
      [-10, 58],
      [58, 22],
      [-10, 22],
      [58, 58],
    ],
  },
);
const land = feature(topo, topo.objects.countries).features.map((f) => geoPath(proj)(f) ?? '');

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="boot">Loading clients…</div>}>
      <Clients />
    </Suspense>
  );
}

function Clients() {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const notify = useStore((s) => s.notify);
  const canSee = useCan('prices');
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = params.get('c');
  const [sel, setSel] = useState<string | null>(q);

  useEffect(() => setSel(q), [q]);

  const sorted = useMemo(() => [...clients].sort((a, b) => b.rev - a.rev), [clients]);
  const byCountry = useMemo(
    () =>
      Object.entries(clients.reduce<Record<string, number>>((a, c) => ((a[c.country] = (a[c.country] ?? 0) + c.rev), a), {})).sort(
        (a, b) => b[1] - a[1],
      ),
    [clients],
  );

  if (!canSee) return <Locked what="Client revenue" />;

  const max = Math.max(...clients.map((c) => c.rev));
  const openCount = (id: string) => projects.filter((p) => p.client === id && p.stage < STAGES.length - 1).length;
  const client = clients.find((c) => c.id === sel);
  const close = () => {
    setSel(null);
    if (q) router.replace(path);
  };

  return (
    <div className="fade">
      <div className="grid g21">
        <div className="card flush">
          <div className="hd">
            <h2>
              <Icon name="users" s />
              Clients
            </h2>
            <button className="btn sm dark" onClick={() => notify('Add client form comes with the full build')}>
              <Icon name="plus" s />
              Add
            </button>
          </div>
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="hide-m">Type</th>
                  <th>Where</th>
                  <th className="r">Revenue</th>
                  <th className="r">Open</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className={`click ${sel === c.id ? 'sel' : ''}`} onClick={() => setSel(c.id)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div className="muted small">{c.contact}</div>
                    </td>
                    <td className="hide-m">
                      <span className="pill p-grey">
                        <Icon name={SECTOR_ICON[c.sector]} s />
                        {c.type}
                      </span>
                    </td>
                    <td className="small">{c.city}</td>
                    <td className="r num">{k(c.rev)}</td>
                    <td className="r num">{openCount(c.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h2>
              <Icon name="map-pin" s />
              Revenue by location
            </h2>
            <svg className="map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of client revenue across Europe and the Gulf">
              <g>
                {land.map((d, i) => (
                  <path key={i} className="land" d={d} />
                ))}
              </g>
              {clients.map((c) => {
                const xy = proj([c.lon, c.lat]);
                if (!xy) return null;
                return (
                  <circle key={c.id} className="cl" cx={xy[0].toFixed(1)} cy={xy[1].toFixed(1)} r={(6 + Math.sqrt(c.rev / max) * 20).toFixed(1)} onClick={() => setSel(c.id)}>
                    <title>{`${c.name}, ${c.city}: ${k(c.rev)}`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
          <div className="card">
            <h2>By country</h2>
            <div style={{ marginTop: 10 }}>
              {byCountry.map(([n, v]) => (
                <div key={n} className="row small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line2)' }}>
                  <span>{n}</span>
                  <span className="sp" />
                  <span className="num">{k(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Drawer open={client != null} title={client?.name ?? ''} onClose={close}>
        {client && <ClientDetail c={client} open={openCount(client.id)} />}
      </Drawer>
    </div>
  );
}

function ClientDetail({ c, open }: { c: Client; open: number }) {
  const all = useStore((s) => s.projects);
  const projects = all.filter((p) => p.client === c.id);
  return (
    <div>
      <div className="muted">
        {c.type}, {c.city}, {c.country}. Client since {c.since}
      </div>
      <div className="grid g2" style={{ marginTop: 14, gridTemplateColumns: '1fr 1fr' }}>
        <Kpi l="Revenue to date" v={k(c.rev)} d="From Xero" ic="currency-gbp" />
        <Kpi l="Open projects" v={open} d={`${projects.length} in total`} ic="kanban" />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>
          <Icon name={SECTOR_ICON[c.sector]} s />
          Contact
        </h2>
        <div className="small" style={{ marginTop: 8 }}>
          {c.contact}
          <br />
          {c.email !== 'n/a' ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className="muted">No direct email, contact via the family office</span>}
        </div>
      </div>
      <div className="card flush" style={{ marginTop: 14 }}>
        <div className="hd">
          <h2>Projects</h2>
        </div>
        <div className="list">
          {projects.length === 0 && <div className="it muted">No projects yet</div>}
          {projects.map((p) => (
            <Link key={p.id} className="it" href={`/projects/${p.id}`}>
              <div className="sp" style={{ minWidth: 0 }}>
                <div className="t1">{p.nda && p.codename ? p.codename : p.title}</div>
                <div className="t2">
                  <span className="num">{p.id}</span> · {STAGES[p.stage]}
                </div>
              </div>
              <span className="num">{p.value ? k(p.value) : 'TBC'}</span>
              <Icon name="caret-right" s />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
