'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Toast } from '@/components/ui';
import { Drawing } from '@/components/Drawing';
import { useHydrated } from '@/components/Shell';
import { useStore } from '@/lib/store';
import { costEstimate, quoteLines } from '@/lib/estimate';
import { addDays, dt, dtime, gbp } from '@/lib/format';

function SigPad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    c.width = c.clientWidth * 2;
    c.height = c.clientHeight * 2;
    const g = c.getContext('2d')!;
    g.scale(2, 2);
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.strokeStyle = '#16191b';
    let down = false;
    const pd = (e: PointerEvent) => {
      down = true;
      c.setPointerCapture(e.pointerId);
      g.beginPath();
      g.moveTo(e.offsetX, e.offsetY);
    };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      g.lineTo(e.offsetX, e.offsetY);
      g.stroke();
    };
    const pu = () => {
      if (down) onChange(c.toDataURL('image/png'));
      down = false;
    };
    c.addEventListener('pointerdown', pd);
    c.addEventListener('pointermove', pm);
    c.addEventListener('pointerup', pu);
    return () => {
      c.removeEventListener('pointerdown', pd);
      c.removeEventListener('pointermove', pm);
      c.removeEventListener('pointerup', pu);
    };
  }, [onChange]);
  return <canvas className="sigpad" ref={ref} aria-label="Sign here" />;
}

function Portal() {
  const { token } = useParams<{ token: string }>();
  const preview = useSearchParams().get('preview') === '1';
  const router = useRouter();
  const hydrated = useHydrated();
  const est = useStore((s) => s.estimates.find((e) => e.token === token));
  const project = useStore((s) => s.projects.find((p) => p.id === est?.projectId));
  const client = useStore((s) => s.clients.find((c) => c.id === project?.client));
  const prices = useStore((s) => s.prices);
  const rates = useStore((s) => s.rates);
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const approveQuote = useStore((s) => s.approveQuote);
  const notify = useStore((s) => s.notify);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [sig, setSig] = useState('');
  const [agree, setAgree] = useState(false);

  const q = useMemo(() => (est ? quoteLines(est, costEstimate(est, prices, rates)) : null), [est, prices, rates]);
  useEffect(() => {
    if (client && !name) setName(client.contact);
  }, [client, name]);

  if (!hydrated) return <div className="boot">Loading…</div>;
  if (!est || !project || !client || !q)
    return (
      <div className="portal">
        <div className="pb empty">This link has expired or is not valid. Please ask Brackenbury Home for a new one.</div>
      </div>
    );

  const drawn = est.items.find((i) => i.parts.length);
  const back = () => {
    if (role === 'client') setRole('director');
    router.push(`/projects/${project.id}${est.status === 'draft' ? '/estimate' : ''}`);
  };
  const quoteDate = est.sentAt ?? new Date().toISOString();

  return (
    <div className="portal">
      <div className="ph">
        <div className="row">
          <svg className="e">
            <use href="#sym-emblem" />
          </svg>
          <svg className="w" viewBox="0 0 2800 839">
            <use href="#sym-word" />
          </svg>
        </div>
        <button className="btn sm" onClick={back}>
          <Icon name="x" s />
          {role === 'client' ? 'Leave client view' : 'Close portal'}
        </button>
      </div>
      <div className="pb fade">
        {(preview || role !== 'client') && est.status === 'draft' && (
          <div className="demo">
            <Icon name="eye" s />
            Preview. This is exactly what {client.contact} will see once the quote is sent.
          </div>
        )}
        {role !== 'client' && !preview && est.status === 'sent' && (
          <div className="rolebar">
            <Icon name="user-switch" s />
            You&apos;re seeing the client&apos;s secret link. Sign below as {client.contact} to approve it.
          </div>
        )}
        <div className="muted small">
          Private and confidential · Quotation QT-{project.id.slice(2)} rev {est.rev} · {dt(quoteDate)}
        </div>
        <h1 style={{ marginTop: 8 }}>{project.title}</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Prepared for {client.contact}, {client.name}
        </p>

        {drawn && (
          <div className="drawing" style={{ marginTop: 24 }}>
            <Drawing parts={drawn.parts} title={drawn.name} client={client.name} rev={drawn.drawing?.rev} />
          </div>
        )}

        <div className="card" style={{ marginTop: 20 }}>
          <h2>What is included</h2>
          <table className="t" style={{ marginTop: 10 }}>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {l.name}
                      {l.qty > 1 ? ` (${l.qty})` : ''}
                    </div>
                    <div className="small muted">{l.desc}</div>
                  </td>
                  <td className="r num">{gbp(l.price)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 600 }}>Total ex VAT</td>
                <td className="r num" style={{ fontWeight: 600 }}>
                  {gbp(q.total)}
                </td>
              </tr>
              <tr>
                <td className="muted small">
                  {client.country === 'UK' ? 'VAT at 20%' : 'VAT: zero-rated on proof of export, which we hold on file for you'}
                </td>
                <td className="r num muted small">{client.country === 'UK' ? gbp(q.total * 0.2) : gbp(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2>Payments</h2>
          <div className="grid" style={{ marginTop: 12, gridTemplateColumns: `repeat(${Math.min(est.schedule.length, 4)}, 1fr)` }}>
            {est.schedule.map((s) => (
              <div key={s.label}>
                <div className="muted small">{s.label}</div>
                <div className="num" style={{ fontSize: 18, marginTop: 4 }}>
                  {gbp((q.total * s.pct) / 100)}
                </div>
                <div className="muted small">{s.pct}%</div>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            Lead time {est.leadWeeks} weeks from drawing approval. Quote valid until {dt(addDays(quoteDate, est.validDays))}.
          </p>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          {est.status === 'approved' ? (
            <>
              <h2>
                <Icon name="check-circle" s />
                Approved, thank you
              </h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Signed by {est.signature?.name}
                {est.signature?.position ? `, ${est.signature.position}` : ''} on {dtime(est.signature?.at ?? est.approvedAt!)}. A copy of the signed quote and the deposit invoice are on their way to you.
              </p>
              {est.signature?.dataUrl && <img src={est.signature.dataUrl} alt="Signature" style={{ maxWidth: 280, marginTop: 10, border: '1px solid var(--line)', borderRadius: 8 }} />}
            </>
          ) : est.status === 'draft' ? (
            <>
              <h2>Approve this quote</h2>
              <p className="muted small" style={{ marginTop: 8 }}>
                The approve button appears here once Brackenbury sends the quote.
              </p>
            </>
          ) : (
            <>
              <h2>Approve this quote</h2>
              <div className="grid g2" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Full name</label>
                  <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Position</label>
                  <input className="inp" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Director" />
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Signature</label>
                <SigPad onChange={setSig} />
              </div>
              <label className="row small" style={{ marginTop: 12, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
                <span>I accept this quotation and the payment schedule above on behalf of {client.name}, and agree to Brackenbury Home&apos;s terms of business.</span>
              </label>
              <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
                <button className="btn gold" disabled={!name.trim() || !sig || !agree} onClick={() => approveQuote(token, { name: name.trim(), position: position.trim(), dataUrl: sig })}>
                  <Icon name="check-circle" s />
                  Approve and request deposit invoice
                </button>
                <button className="btn" onClick={() => notify('Your question has been sent to Brackenbury Home')}>
                  Ask a question
                </button>
              </div>
              {(!sig || !agree) && <p className="hint">Sign in the box and tick the acceptance to approve.</p>}
            </>
          )}
        </div>
        {role !== 'client' && est.status === 'approved' && (
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn dark" href={`/projects/${project.id}`}>
              Back to the project
              <Icon name="arrow-right" s />
            </Link>
          </div>
        )}
      </div>
      <Toast />
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense>
      <Portal />
    </Suspense>
  );
}
