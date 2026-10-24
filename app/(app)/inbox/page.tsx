'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Drawer, Due, Locked, useCan } from '@/components/ui';
import { useStore } from '@/lib/store';
import { TEMPLATES } from '@/lib/demo/reference';
import { addDays, dshort, gbp, ini, TODAY } from '@/lib/format';
import type { Mail } from '@/lib/types';

const RULES: [string, string, string][] = [
  ['Quote sent, no reply', 'Quote follow-up 1 after 3 working days', 'Follow-up 2 after 7 more days, then alert the director'],
  ['Drawings waiting for approval', 'Drawing reminder after 5 working days', 'Alert the project manager'],
  ['Samples waiting', 'Sample approval reminder after 3 days', 'Repeat weekly'],
  ['Invoice overdue', 'Payment reminder (polite) on day 3', 'Firmer reminder on day 14, then the director calls'],
  ['Supplier price older than 90 days', 'Ask supplier to requote', 'Flag in every estimate using it'],
];

const longDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

export default function InboxPage() {
  const inbox = useStore((s) => s.inbox);
  const projects = useStore((s) => s.projects);
  const chases = useStore((s) => s.chases);
  const readMail = useStore((s) => s.readMail);
  const sendChase = useStore((s) => s.sendChase);
  const canEmail = useCan('emails');
  const [selId, setSelId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ proj: string | null; tpl: string; to?: string } | null>(null);

  if (!canEmail) return <Locked what="The shared inbox" />;

  const sel = inbox.find((m) => m.id === selId) ?? inbox[0];
  const open = (m: Mail) => {
    setSelId(m.id);
    if (m.unread) readMail(m.id);
  };

  return (
    <div className="fade">
      <div className="grid g12">
        <div className="card flush">
          <div className="hd">
            <h2>
              <Icon name="envelope-simple" s />
              Inbox
            </h2>
            <span className="muted small">enquiries@ and info@</span>
          </div>
          <div className="list">
            {inbox.map((m) => (
              <div
                key={m.id}
                className="it"
                style={{ cursor: 'pointer', background: sel?.id === m.id ? 'var(--panel2)' : undefined }}
                onClick={() => open(m)}
              >
                <div className="av" style={{ background: m.supplier ? '#7c8589' : '#2f5d50', width: 30, height: 30, fontSize: 11 }}>
                  {ini(m.from)}
                </div>
                <div className="sp" style={{ minWidth: 0 }}>
                  <div className="t1" style={m.unread ? undefined : { fontWeight: 400 }}>
                    {m.from}
                  </div>
                  <div className="t2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.subj}
                  </div>
                </div>
                {m.unread && <span className="pill p-blue">New</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">{sel ? <MailView m={sel} onReply={(tpl) => setCompose({ proj: sel.proj, tpl, to: sel.supplier ? 'quotes@jameslatham.example' : undefined })} /> : <div className="empty">No mail</div>}</div>
      </div>

      <div className="card flush mt16">
        <div className="hd">
          <h2>
            <Icon name="paper-plane-tilt" s />
            Chases in progress
          </h2>
          <span className="muted small">{chases.length} live</span>
        </div>
        {chases.length === 0 ? (
          <div className="empty">Nothing waiting on a reply</div>
        ) : (
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Waiting on</th>
                  <th>Next email</th>
                  <th className="r">Sent</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {chases.map((h) => {
                  const p = projects.find((x) => x.id === h.proj);
                  return (
                    <tr key={h.id}>
                      <td>
                        <Link href={`/projects/${h.proj}`} style={{ fontWeight: 500 }}>
                          {p?.title ?? h.proj}
                        </Link>
                        <div className="muted small num">{h.proj}</div>
                      </td>
                      <td className="small">{h.what}</td>
                      <td className="small">
                        {h.tpl}
                        {h.auto && <span className="muted"> · automatic</span>}
                      </td>
                      <td className="r num small">{h.n}</td>
                      <td>
                        <Due d={h.next} />
                      </td>
                      <td className="r">
                        <button className="btn sm" onClick={() => sendChase(h.id)}>
                          <Icon name="paper-plane-tilt" s />
                          Send now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card flush mt16">
        <div className="hd">
          <h2>
            <Icon name="arrows-clockwise" s />
            Automatic chasing rules
          </h2>
        </div>
        <div className="scroll-x">
          <table className="t">
            <thead>
              <tr>
                <th>When</th>
                <th>Send</th>
                <th>Then</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td className="small">{r[1]}</td>
                  <td className="small muted">{r[2]}</td>
                  <td>
                    <span className="pill p-green">On</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={compose != null} title="Reply with template" onClose={() => setCompose(null)}>
        {compose && <Composer key={compose.proj ?? 'none'} proj={compose.proj} tpl={compose.tpl} to={compose.to} onDone={() => setCompose(null)} />}
      </Drawer>
    </div>
  );
}

function MailView({ m, onReply }: { m: Mail; onReply: (tpl: string) => void }) {
  const clients = useStore((s) => s.clients);
  const updatePrice = useStore((s) => s.updatePrice);
  const notify = useStore((s) => s.notify);
  const c = m.org ? clients.find((x) => x.id === m.org) : undefined;

  const updateBook = () => {
    updatePrice('MDF-WAL-19', 189.5, 'Quote 448219, from inbox');
    updatePrice('MDF-WAL-9', 119.8, 'Quote 448219, from inbox');
    notify('2 prices updated in the price book from quotation 448219');
  };

  return (
    <div key={m.id} className="fade">
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{m.subj}</div>
          <div className="muted small">
            {m.from}
            {c ? `, ${c.name}` : ''} · {m.dt}
          </div>
        </div>
        {m.proj && (
          <Link className="btn sm" href={`/projects/${m.proj}`}>
            <Icon name="link" s />
            {m.proj}
          </Link>
        )}
      </div>
      <div style={{ marginTop: 16, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{m.body}</div>
      {m.att && (
        <div className="row" style={{ marginTop: 16, padding: 10, border: '1px solid var(--line)', borderRadius: 8, flexWrap: 'wrap' }}>
          <Icon name="files" s />
          <span className="small">{m.att}</span>
          <span className="sp" />
          {m.id === 'E1' ? (
            <Link className="btn sm dark" href="/projects/P-2051/estimate">
              <Icon name="ruler" s />
              Estimate from drawing
            </Link>
          ) : m.supplier ? (
            <button className="btn sm dark" onClick={updateBook}>
              <Icon name="package" s />
              Update price book
            </button>
          ) : null}
        </div>
      )}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => onReply('Quote follow-up 1')}>
          <Icon name="paper-plane-tilt" s />
          Reply with template
        </button>
      </div>
    </div>
  );
}

function Composer({ proj, tpl, to, onDone }: { proj: string | null; tpl: string; to?: string; onDone: () => void }) {
  const p = useStore((s) => s.projects.find((x) => x.id === proj));
  const c = useStore((s) => s.clients.find((x) => x.id === p?.client));
  const est = useStore((s) => s.estimates.find((e) => e.projectId === proj));
  const inv = useStore((s) => s.invoices.find((i) => i.proj === proj && i.status !== 'Paid'));
  const sendEmail = useStore((s) => s.sendEmail);
  const notify = useStore((s) => s.notify);

  const fill = (name: string) => {
    const t = TEMPLATES.find((x) => x.n === name) ?? TEMPLATES[0];
    const fields: Record<string, string> = {
      first_name: c ? c.contact.split(' ')[0] : 'there',
      quote_ref: 'QT-' + (proj ?? 'P-0000').slice(2),
      project_title: p ? p.title.toLowerCase() : 'project',
      portal_link: est ? `brackenburyhome.com/q/${est.token}` : 'brackenburyhome.com',
      sender: 'Harriet Cole',
      lead_time: `${est?.leadWeeks ?? 14} weeks`,
      hold_date: longDate(addDays(TODAY, 17)),
      start_date: longDate(addDays(TODAY, 13)),
      approve_by: longDate(addDays(TODAY, 7)),
      invoice_ref: inv?.ref ?? 'the invoice',
      amount: inv ? gbp(inv.amt) : 'the balance',
      due_date: inv ? longDate(new Date(inv.due)) : 'the due date',
    };
    return t.b.replace(/{{(\w+)}}/g, (_, f: string) => fields[f] ?? `{{${f}}}`);
  };

  const [name, setName] = useState(tpl);
  const [toAddr, setToAddr] = useState(to ?? (c && c.email !== 'n/a' ? c.email : ''));
  const [body, setBody] = useState(() => fill(tpl));

  const subject = `${name}${p ? ': ' + p.title : ''}`;

  return (
    <div>
      {p && (
        <div className="muted small" style={{ marginBottom: 12 }}>
          Filed to {p.id}, {p.title}
          {c ? ` for ${c.contact}` : ''}
        </div>
      )}
      <div className="field">
        <label htmlFor="tpl">Template</label>
        <select
          id="tpl"
          className="inp"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setBody(fill(e.target.value));
          }}
        >
          {TEMPLATES.map((x) => (
            <option key={x.n}>{x.n}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="to">To</label>
        <input id="to" className="inp" value={toAddr} onChange={(e) => setToAddr(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="msg">Message</label>
        <textarea id="msg" className="inp" rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
        <button
          className="btn dark"
          disabled={!toAddr.trim()}
          onClick={() => {
            sendEmail(proj, subject);
            onDone();
          }}
        >
          <Icon name="paper-plane-tilt" s />
          Send
        </button>
        <button
          className="btn"
          onClick={() => {
            notify(`Scheduled for 9am ${dshort(addDays(TODAY, 1))}`);
            onDone();
          }}
        >
          Send tomorrow 9am
        </button>
      </div>
    </div>
  );
}
