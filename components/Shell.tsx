'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Drawer, Toast, can } from './ui';
import { useStore, roleName } from '@/lib/store';
import { ROLES } from '@/lib/demo/reference';
import { days, gbp } from '@/lib/format';
import type { Role } from '@/lib/types';

type NavItem = { href: string; label: string; icon: string; count?: number; roles?: Role[] };

const STAFF_ROLES: Role[] = ['director', 'office', 'workshop', 'fitter'];
const MONEY: Role[] = ['director', 'office'];

function useNav(): [string, NavItem[]][] {
  const s = useStore();
  const compDue = s.compliance.filter((c) => days(c.next) <= 14).length;
  const unread = s.inbox.filter((m) => m.unread).length;
  return [
    [
      'Run the business',
      [
        { href: '/', label: 'Overview', icon: 'squares-four', roles: MONEY },
        { href: '/pipeline', label: 'Pipeline', icon: 'kanban', count: s.projects.length, roles: STAFF_ROLES },
        { href: '/inbox', label: 'Inbox', icon: 'envelope-simple', count: unread || undefined, roles: MONEY },
      ],
    ],
    [
      'Make',
      [
        { href: '/estimates', label: 'Estimates', icon: 'calculator', roles: MONEY },
        { href: '/workshop', label: 'Workshop', icon: 'hammer', roles: ['director', 'office', 'workshop', 'fitter'] },
      ],
    ],
    [
      'People and places',
      [
        { href: '/clients', label: 'Clients', icon: 'users', roles: MONEY },
        { href: '/people', label: 'People', icon: 'identification-card', roles: STAFF_ROLES },
        { href: '/compliance', label: 'Compliance', icon: 'shield-check', count: compDue || undefined, roles: STAFF_ROLES },
      ],
    ],
    [
      'Money',
      [
        { href: '/finance', label: 'Finance', icon: 'bank', roles: MONEY },
        { href: '/pricebook', label: 'Price book', icon: 'package', roles: MONEY },
      ],
    ],
    [
      'System',
      [
        { href: '/procedures', label: 'Procedures', icon: 'book-open', roles: STAFF_ROLES },
        { href: '/settings', label: 'Access and demo', icon: 'gear' },
      ],
    ],
  ];
}

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Overview'],
  [/^\/pipeline/, 'Pipeline'],
  [/^\/inbox/, 'Inbox'],
  [/^\/estimates/, 'Estimates'],
  [/^\/workshop/, 'Workshop'],
  [/^\/projects\/[^/]+\/estimate/, 'Estimator'],
  [/^\/projects\/[^/]+\/model/, '3D and cutting list'],
  [/^\/projects\//, 'Project'],
  [/^\/clients/, 'Clients'],
  [/^\/people\/.+/, 'Person'],
  [/^\/people/, 'People'],
  [/^\/compliance/, 'Compliance'],
  [/^\/finance/, 'Finance'],
  [/^\/pricebook/, 'Price book'],
  [/^\/procedures/, 'Procedures'],
  [/^\/settings/, 'Access and demo'],
];

export function Brand() {
  return (
    <div className="brand">
      <svg className="e">
        <use href="#sym-emblem" />
      </svg>
      <svg className="w" viewBox="0 0 2800 839">
        <use href="#sym-word" />
      </svg>
    </div>
  );
}

/** Wait for the browser copy of the demo data before rendering, so server and client agree. */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const done = () => setOk(true);
    if (useStore.persist.hasHydrated()) done();
    return useStore.persist.onFinishHydration(done);
  }, []);
  return ok;
}

export function Shell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const path = usePathname();
  const router = useRouter();
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const estimates = useStore((s) => s.estimates);
  const nav = useNav();
  const [menu, setMenu] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const title = TITLES.find(([re]) => re.test(path))?.[1] ?? 'Brackenbury OS';

  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (hydrated && role === 'client') {
      const e = estimates.find((x) => x.projectId === 'P-2051') ?? estimates[0];
      router.push(`/portal/${e.token}`);
    }
  }, [hydrated, role, estimates, router]);

  if (!hydrated) return <div className="boot">Loading Brackenbury OS…</div>;
  const me = ROLES.find((r) => r.id === role)!;

  return (
    <div className={`app ${menu ? 'menu-open' : ''}`}>
      <aside className="side">
        <Brand />
        {nav.map(([grp, items]) => {
          const vis = items.filter((i) => !i.roles || i.roles.includes(role));
          if (!vis.length) return null;
          return (
            <div key={grp}>
              <div className="navgrp">{grp}</div>
              <nav className="nav">
                {vis.map((i) => {
                  const on = i.href === '/' ? path === '/' : path.startsWith(i.href);
                  return (
                    <Link key={i.href} href={i.href} className={on ? 'on' : ''}>
                      <Icon name={i.icon} />
                      {i.label}
                      {i.count != null && <span className="ct">{i.count}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
        <div style={{ marginTop: 'auto', position: 'relative' }}>
          {roleOpen && (
            <div className="card" style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, padding: 6, marginBottom: 6, boxShadow: '0 10px 30px rgba(22,25,27,.12)' }}>
              <div className="small muted" style={{ padding: '6px 8px' }}>
                View the system as
              </div>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  className="row"
                  style={{ width: '100%', padding: '8px', borderRadius: 6, background: r.id === role ? 'var(--line2)' : undefined }}
                  onClick={() => {
                    setRole(r.id);
                    setRoleOpen(false);
                    if (r.id === 'workshop' || r.id === 'fitter') router.push('/workshop');
                    else if (r.id !== 'client') router.push('/');
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{r.label}</span>
                  <span className="sp" />
                  <span className="small muted">{r.who}</span>
                </button>
              ))}
            </div>
          )}
          <button className="me" style={{ width: '100%', textAlign: 'left' }} onClick={() => setRoleOpen((v) => !v)} title="Switch role to see what each person can see">
            <div className="av" style={{ background: 'var(--ink)' }}>
              {me.label.slice(0, 2).toUpperCase()}
            </div>
            <div>
              {me.label}
              <small>{role === 'director' ? 'Full access' : roleName(role)}</small>
            </div>
            <span className="sp" />
            <Icon name="user-switch" s />
          </button>
        </div>
      </aside>
      <div className="scrim" style={menu ? { opacity: 1, pointerEvents: 'auto', zIndex: 65 } : undefined} onClick={() => setMenu(false)} />
      <main className="main">
        <header className="top">
          <button className="iconbtn burger" onClick={() => setMenu(true)} aria-label="Menu">
            <Icon name="list" />
          </button>
          <div>
            <div className="crumb">Brackenbury Home</div>
            <h1>{title}</h1>
          </div>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <Search />
            <button className="iconbtn" onClick={() => setAlerts(true)} aria-label="Alerts">
              <Icon name="bell" />
              <span className="dot" />
            </button>
          </div>
        </header>
        <div className="content">
          {role !== 'director' && (
            <div className="rolebar">
              <Icon name="user-switch" s />
              Viewing as {me.label.toLowerCase()} ({me.who}). Prices, pay and screens this role cannot see are hidden.
              <span className="sp" />
              <button className="btn sm" onClick={() => { setRole('director'); router.push('/'); }}>
                Back to director
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
      <Alerts open={alerts} onClose={() => setAlerts(false)} />
      <Toast />
    </div>
  );
}

function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const estimates = useStore((s) => s.estimates);
  const role = useStore((s) => s.role);

  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { label: string; sub: string; href: string }[] = [];
    for (const p of projects) if ((p.title + ' ' + p.id).toLowerCase().includes(t)) out.push({ label: p.title, sub: p.id, href: `/projects/${p.id}` });
    if (can(role, 'allProjects') || can(role, 'prices'))
      for (const c of clients) if ((c.name + ' ' + c.contact).toLowerCase().includes(t)) out.push({ label: c.name, sub: c.contact, href: `/clients?c=${c.id}` });
    for (const e of estimates)
      for (const it of e.items)
        for (const pt of it.parts)
          if (pt.name.toLowerCase().includes(t)) out.push({ label: `${pt.name}`, sub: `${it.name}, ${e.projectId}`, href: `/projects/${e.projectId}/model?part=${pt.id}&item=${it.id}` });
    return out.slice(0, 8);
  }, [q, projects, clients, estimates, role]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById('gsearch')?.focus();
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);

  return (
    <div className="search" style={{ position: 'relative' }}>
      <Icon name="magnifying-glass" s />
      <input
        id="gsearch"
        placeholder="Search projects, clients, parts"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <kbd>/</kbd>
      {open && res.length > 0 && (
        <div className="card" style={{ position: 'absolute', top: '110%', left: 0, right: 0, padding: 4, zIndex: 40, boxShadow: '0 12px 30px rgba(22,25,27,.12)' }}>
          {res.map((r, i) => (
            <button
              key={i}
              className="row"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, textAlign: 'left' }}
              onMouseDown={() => {
                router.push(r.href);
                setQ('');
              }}
            >
              <span style={{ color: 'var(--ink)' }}>{r.label}</span>
              <span className="sp" />
              <span className="small muted">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Alerts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const items: [string, string, string, string, string?][] = [
    ...s.compliance.filter((c) => days(c.next) < 0).map((c) => ['warning', 'red', `${c.n} is overdue`, c.basis, '/compliance'] as [string, string, string, string, string]),
    ...s.invoices.filter((i) => i.status === 'Overdue').map((i) => ['receipt', 'red', `${i.ref} is ${-days(i.due)} days overdue`, `${s.clients.find((c) => c.id === i.client)?.name}, ${gbp(i.amt)}`, '/finance'] as [string, string, string, string, string]),
    ['clock', 'amber', 'Ellis Marsh: wood dust spirometry overdue', 'Book with occupational health', '/people/S4'],
    ['clock', 'amber', 'Megan Hart: SMSTS expires 18 Nov', 'Book refresher course', '/people/S2'],
    ['chart-line', 'red', 'P-2043 margin down to 24.1%', 'Leather cost rose 11% after quote', '/projects/P-2043'],
  ];
  return (
    <Drawer open={open} title="Needs your attention" onClose={onClose}>
      <div className="list">
        {items.map(([ic, c, t, sub, href], i) => (
          <Link key={i} className="it" href={href ?? '#'} onClick={onClose}>
            <div className={`ico ${c}`}>
              <Icon name={ic} s />
            </div>
            <div className="sp">
              <div className="t1">{t}</div>
              <div className="t2">{sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </Drawer>
  );
}
