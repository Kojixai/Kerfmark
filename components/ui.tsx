'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { days, dshort } from '@/lib/format';
import { STAGES, type Health, type Role } from '@/lib/types';
import { useStore } from '@/lib/store';

export function Kpi({ l, v, d, ic, cls = '' }: { l: string; v: ReactNode; d?: ReactNode; ic: string; cls?: string }) {
  return (
    <div className="card kpi">
      <div className="l">
        <Icon name={ic} s />
        {l}
      </div>
      <div className="v">{v}</div>
      {d != null && <div className={`d ${cls}`}>{d}</div>}
    </div>
  );
}

export function HealthPill({ h }: { h: Health }) {
  if (h === 'risk') return <span className="pill p-red">At risk</span>;
  if (h === 'chase') return <span className="pill p-amber">Chasing</span>;
  return <span className="pill p-green">On track</span>;
}

export function Due({ d }: { d: string }) {
  const n = days(d);
  if (n < 0) return <span className="pill p-red">{-n}d overdue</span>;
  if (n <= 14) return <span className="pill p-amber">Due in {n}d</span>;
  return <span className="pill p-grey">{dshort(d)}</span>;
}

export function StageMini({ s }: { s: number }) {
  return (
    <div className="row small" style={{ gap: 6 }}>
      <div className="bar" style={{ width: 70 }}>
        <i style={{ width: `${((s + 1) / STAGES.length) * 100}%` }} />
      </div>
      <span>{STAGES[s]}</span>
    </div>
  );
}

export function Card({ title, icon, right, children, flush, className = '', style }: { title?: ReactNode; icon?: string; right?: ReactNode; children: ReactNode; flush?: boolean; className?: string; style?: React.CSSProperties }) {
  if (flush)
    return (
      <div className={`card flush ${className}`} style={style}>
        {title != null && (
          <div className="hd">
            <h2>
              {icon && <Icon name={icon} s />}
              {title}
            </h2>
            {right}
          </div>
        )}
        {children}
      </div>
    );
  return (
    <div className={`card ${className}`} style={style}>
      {title != null && (
        <h2>
          {icon && <Icon name={icon} s />}
          {title}
          {right && <span className="r">{right}</span>}
        </h2>
      )}
      {children}
    </div>
  );
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="dh">
          <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="x" s />
          </button>
        </div>
        <div className="db">{open && children}</div>
      </aside>
    </>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className={`toast ${on ? 'on' : ''}`} role="status">
      <Icon name="check-circle" s />
      {toast?.text}
    </div>
  );
}

/** Shown in place of content a role is not allowed to see. */
export function Locked({ what }: { what: string }) {
  return (
    <div className="card locked">
      <Icon name="lock-key" />
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{what} is hidden for this role</div>
      <div className="small">In the real system the database refuses the query, so nothing reaches the screen to hide.</div>
    </div>
  );
}

// ---------- permissions, mirroring role_permissions in supabase/seed.sql ----------

export type Perm = 'prices' | 'pay' | 'approve' | 'xero' | 'emails' | 'compliance' | 'cutting' | 'allProjects' | 'estimate';

const PERMS: Record<Role, Perm[]> = {
  director: ['prices', 'pay', 'approve', 'xero', 'emails', 'compliance', 'cutting', 'allProjects', 'estimate'],
  office: ['prices', 'xero', 'emails', 'compliance', 'cutting', 'allProjects', 'estimate'],
  workshop: ['compliance', 'cutting', 'allProjects'],
  fitter: ['compliance', 'cutting'],
  subcontractor: ['cutting'],
  client: [],
};

export const can = (role: Role, p: Perm) => PERMS[role].includes(p);
export const useCan = (p: Perm) => useStore((s) => can(s.role, p));
