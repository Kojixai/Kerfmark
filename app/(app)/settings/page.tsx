'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/ui';
import { useStore } from '@/lib/store';
import { ROLES } from '@/lib/demo/reference';
import type { Role } from '@/lib/types';

const PERM_ROLES = ['Director', 'Office', 'Workshop', 'Fitter', 'Subcontractor', 'Client'];

// Mirrors role_permissions in supabase/seed.sql. 'y' = yes, 'n' = no, anything else is a scope.
const PERMS: [string, ...string[]][] = [
  ['See all projects', 'y', 'y', 'y', 'own', 'scoped', 'own'],
  ['See prices and margins', 'y', 'y', 'n', 'n', 'n', 'quote only'],
  ['Approve quotes', 'y', 'n', 'n', 'n', 'n', 'own'],
  ['See pay and HR', 'y', 'n', 'n', 'n', 'n', 'n'],
  ['Edit compliance log', 'y', 'y', 'y', 'y', 'n', 'n'],
  ['Cutting lists and 3D', 'y', 'y', 'y', 'y', 'scoped', 'n'],
  ['Send emails', 'y', 'y', 'n', 'n', 'n', 'n'],
  ['Xero and bank data', 'y', 'read', 'n', 'n', 'n', 'n'],
];

const CONNECTIONS: [string, string, string, string][] = [
  ['Xero', 'Accounting, invoices, bills, bank transactions', 'Connected', 'bank'],
  ['Xero Payroll', 'Payslips and pay runs, read only, director only', 'Connected', 'lock-key'],
  ['Microsoft 365 mail', 'Files every email to the right client and project', 'Connected', 'envelope-simple'],
  ['Client portal', 'Branded secret links for quotes, drawings, samples and payments', 'Live', 'link'],
  ['Supplier prices', 'Reads quotes and invoices from suppliers into the price book', 'Live', 'package'],
  ['E-signature', 'Quote and drawing approvals with an audit trail', 'Built in', 'signature'],
  ['Calendar', 'Compliance and certificate reminders', 'Connected', 'calendar-blank'],
];

function Cell({ v }: { v: string }) {
  if (v === 'y')
    return (
      <span className="tick y">
        <Icon name="check-circle" s />
      </span>
    );
  if (v === 'n') return <span className="tick n">-</span>;
  return <span className="pill p-grey">{v}</span>;
}

export default function SettingsPage() {
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const reset = useStore((s) => s.reset);
  const router = useRouter();

  const viewAs = (r: Role) => {
    setRole(r);
    if (r === 'workshop' || r === 'fitter') router.push('/workshop');
    else if (r !== 'client') router.push('/');
    // The client role is sent to the portal by the shell.
  };

  return (
    <div className="fade">
      <div className="card flush">
        <div className="hd" style={{ flexWrap: 'wrap' }}>
          <h2>
            <Icon name="lock-key" s />
            Who can see what
          </h2>
          <span className="muted small">Enforced in the database, not just hidden on screen</span>
        </div>
        <div className="scroll-x">
          <table className="t matrix">
            <thead>
              <tr>
                <th>Permission</th>
                {PERM_ROLES.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map(([n, ...vals]) => (
                <tr key={n}>
                  <td style={{ whiteSpace: 'nowrap' }}>{n}</td>
                  {vals.map((v, i) => (
                    <td key={i}>
                      <Cell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Card title="View the system as" icon="user-switch" className="mt16" right="Try each role to see what it can and cannot see">
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 12, gap: 8 }}>
          {ROLES.map((r) => (
            <button key={r.id} className={`btn ${r.id === role ? 'dark' : ''}`} onClick={() => viewAs(r.id)} aria-pressed={r.id === role}>
              {r.label}
              <span className="small" style={{ opacity: 0.65, fontWeight: 400 }}>
                {r.who}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid g3 mt16">
        {CONNECTIONS.map(([n, d, s, ic]) => (
          <div key={n} className="card">
            <div className="row">
              <div className="ico gold">
                <Icon name={ic} s />
              </div>
              <div style={{ fontWeight: 600 }}>{n}</div>
              <span className="sp" />
              <span className="pill p-green">{s}</span>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              {d}
            </p>
          </div>
        ))}
        <div className="card">
          <div className="row">
            <div className="ico amber">
              <Icon name="arrow-counter-clockwise" s />
            </div>
            <div style={{ fontWeight: 600 }}>Demo data</div>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Everything you change is saved in this browser only. Nothing is sent anywhere. Reset puts the projects, prices and inbox back to the start.
          </p>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() => reset()}
          >
            <Icon name="arrow-counter-clockwise" s />
            Reset demo data
          </button>
        </div>
      </div>
    </div>
  );
}
