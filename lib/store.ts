'use client';

// Demo state, kept in the browser (localStorage) so a project can be walked from enquiry to
// final invoice and still be there on reload. In the real build each action here becomes a
// Supabase insert/update (or an RPC), and the role comes from the JWT instead of a switcher.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { costEstimate, quoteLines, axisFor } from './estimate';
import { defaultExtras, defaultOps, generateParts } from './parametric';
import { addDays, nowIso, round10, TODAY, uid } from './format';
import { buildSeed } from './demo/seed';
import { PRICES, RATES, OVERHEAD_PCT } from './demo/prices';
import { CLIENTS, COMPLIANCE } from './demo/reference';
import type {
  Bill,
  Chase,
  Client,
  ComplianceCheck,
  DesignSpec,
  Estimate,
  EstimateItem,
  Invoice,
  Mail,
  Operation,
  Part,
  PriceItem,
  Project,
  Rates,
  Role,
  Sector,
  Signature,
  Subcontract,
  Extra,
} from './types';

export interface DemoState {
  role: Role;
  projects: Project[];
  estimates: Estimate[];
  prices: PriceItem[];
  rates: Rates;
  clients: Client[];
  invoices: Invoice[];
  bills: Bill[];
  chases: Chase[];
  inbox: Mail[];
  compliance: ComplianceCheck[];
  toast: { id: number; text: string } | null;
}

interface Actions {
  setRole: (r: Role) => void;
  notify: (text: string) => void;
  reset: () => void;

  editEstimate: (estId: string, recipe: (e: Estimate) => void) => void;
  editItem: (estId: string, itemId: string, recipe: (i: EstimateItem) => void) => void;
  updatePart: (estId: string, itemId: string, partId: string, patch: Partial<Part>) => void;
  setPartDim: (estId: string, itemId: string, partId: string, which: 0 | 1 | 2, mm: number) => void;
  addPart: (estId: string, itemId: string) => void;
  removePart: (estId: string, itemId: string, partId: string) => void;
  setDesign: (estId: string, itemId: string, spec: DesignSpec) => void;
  addItem: (estId: string, spec: DesignSpec | null, name: string) => string;
  removeItem: (estId: string, itemId: string) => void;
  requestSubPrice: (estId: string, itemId: string, subId: string) => void;

  updatePrice: (sku: string, p: number, src: string) => void;

  newEnquiry: (p: { client: string; title: string; sector: Sector; brief: string; file?: string }) => string;
  startEstimate: (projectId: string, spec: DesignSpec | null, itemName: string, file?: string) => void;
  sendQuote: (projectId: string) => void;
  approveQuote: (token: string, sig: Omit<Signature, 'at' | 'ip' | 'ua'>) => void;
  advance: (projectId: string) => void;
  sendChase: (chaseId: string) => void;
  sendEmail: (projectId: string | null, subject: string) => void;
  logCompliance: (id: string) => void;
  readMail: (id: string) => void;
}

export type Store = DemoState & Actions;

const fresh = (): DemoState => {
  const s = buildSeed();
  return {
    role: 'director',
    ...s,
    prices: structuredClone(PRICES),
    rates: { ...RATES },
    clients: structuredClone(CLIENTS),
    compliance: structuredClone(COMPLIANCE),
    toast: null,
  };
};

const nextRef = (list: { ref: string }[], prefix: string) =>
  prefix + (Math.max(...list.map((x) => +x.ref.replace(/\D/g, '') || 0)) + 1);

const freqDays = (f: string) =>
  /week/i.test(f) ? 7 : /3 months/.test(f) ? 91 : /6 months/.test(f) ? 182 : /14 months/.test(f) ? 426 : /month/i.test(f) ? 30 : /5 years/.test(f) ? 1826 : /2 years/.test(f) ? 730 : 365;

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const evt = (projectId: string, text: string, icon: string, who = roleName(get().role)) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, updated: nowIso().slice(0, 10), events: [...p.events, { id: uid('ev'), at: nowIso(), text, icon, who }] } : p,
          ),
        }));
      const patchProject = (id: string, patch: Partial<Project>) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      const estimateFor = (projectId: string) => get().estimates.find((e) => e.projectId === projectId);
      const totalFor = (e: Estimate) => quoteLines(e, costEstimate(e, get().prices, get().rates)).total;
      const raiseInvoice = (p: Project, label: string, pct: number, dueIn: number) => {
        const ref = nextRef(get().invoices, 'INV-');
        const inv: Invoice = { ref, proj: p.id, client: p.client, amt: Math.round((p.value * pct) / 100), due: addDays(nowIso(), dueIn).toISOString().slice(0, 10), status: 'Sent', label };
        set((s) => ({ invoices: [inv, ...s.invoices] }));
        return inv;
      };

      return {
        ...fresh(),

        setRole: (role) => set({ role }),
        notify: (text) => set({ toast: { id: Date.now(), text } }),
        reset: () => {
          set({ ...fresh() });
          get().notify('Demo data reset');
        },

        editEstimate: (estId, recipe) =>
          set((s) => ({
            estimates: s.estimates.map((e) => {
              if (e.id !== estId) return e;
              const c = structuredClone(e);
              recipe(c);
              return c;
            }),
          })),
        editItem: (estId, itemId, recipe) =>
          get().editEstimate(estId, (e) => {
            const it = e.items.find((i) => i.id === itemId);
            if (it) recipe(it);
          }),
        updatePart: (estId, itemId, partId, patch) =>
          get().editItem(estId, itemId, (it) => {
            const p = it.parts.find((x) => x.id === partId);
            if (p) Object.assign(p, patch);
          }),
        setPartDim: (estId, itemId, partId, which, mm) =>
          get().editItem(estId, itemId, (it) => {
            const p = it.parts.find((x) => x.id === partId);
            if (!p || !(mm > 0)) return;
            p[axisFor(p, which)] = Math.round(mm);
            p.checked = true;
          }),
        addPart: (estId, itemId) =>
          get().editItem(estId, itemId, (it) => {
            const sku = it.parts.find((p) => get().prices.find((x) => x.sku === p.sku)?.unit === 'sheet')?.sku ?? 'MDF-18-MR';
            it.parts.push({ id: uid('pt'), name: 'New part', sku, w: 600, h: 19, d: 400, x: 0, y: -400, z: 0, dir: [0, -1, 0], qty: 1, grain: 'L', edge: 0, finish: true, conf: 100, checked: true });
          }),
        removePart: (estId, itemId, partId) =>
          get().editItem(estId, itemId, (it) => {
            it.parts = it.parts.filter((p) => p.id !== partId);
          }),
        setDesign: (estId, itemId, spec) =>
          get().editItem(estId, itemId, (it) => {
            const prev = it.design;
            it.design = spec;
            it.parts = generateParts(spec, get().prices);
            if (!prev) return;
            // Workshop and finishing time follow the surface area being made; drawing and fitting don't.
            const area = (d: DesignSpec) => d.W * d.H + d.W * d.D + d.H * d.D;
            const f = area(spec) / area(prev);
            for (const op of it.ops) if (op.rate === 'workshop' || op.rate === 'finishing') op.hours = Math.max(0.5, Math.round(op.hours * f * 2) / 2);
            it.desc = it.desc.replace(`${prev.W} x ${prev.D} x ${prev.H}`, `${spec.W} x ${spec.D} x ${spec.H}`);
          }),
        addItem: (estId, spec, name) => {
          const id = uid('I-');
          get().editEstimate(estId, (e) => {
            const parts = spec ? generateParts(spec, get().prices) : [];
            e.items.push({
              id,
              name,
              desc: name,
              qty: 1,
              design: spec ?? undefined,
              parts,
              extras: spec ? defaultExtras(spec).map((x) => ({ id: uid('X'), ...x })) : [],
              ops: spec ? defaultOps(spec, parts.length).map((o) => ({ id: uid('O'), ...o })) : [{ id: uid('O'), name: 'Labour', hours: 8, rate: 'workshop' }],
              subs: [],
            });
          });
          return id;
        },
        removeItem: (estId, itemId) =>
          get().editEstimate(estId, (e) => {
            e.items = e.items.filter((i) => i.id !== itemId);
          }),
        requestSubPrice: (estId, itemId, subId) => {
          let supplier = '';
          get().editItem(estId, itemId, (it) => {
            const s = it.subs.find((x) => x.id === subId);
            if (s) {
              s.status = 'requested';
              supplier = s.supplier;
            }
          });
          get().notify(`Price request link sent to ${supplier}`);
        },

        updatePrice: (sku, p, src) =>
          set((s) => ({
            prices: s.prices.map((x) =>
              x.sku === sku ? { ...x, history: [...(x.history ?? []), { dt: x.dt, p: x.p, src: x.src }], p, src, dt: TODAY.toISOString().slice(0, 10), validUntil: undefined } : x,
            ),
          })),

        newEnquiry: ({ client, title, sector, brief, file }) => {
          const id = 'P-' + (Math.max(...get().projects.map((p) => +p.id.slice(2))) + 1);
          const c = get().clients.find((x) => x.id === client)!;
          const p: Project = {
            id,
            title,
            client,
            sector,
            value: 0,
            stage: 0,
            pm: 'Megan Hart',
            due: addDays(TODAY, 120).toISOString().slice(0, 10),
            updated: nowIso().slice(0, 10),
            health: 'ok',
            contract: 'supply_and_fit',
            brief,
            events: [{ id: uid('ev'), at: nowIso(), text: `Enquiry logged for ${c.contact}${file ? ` with ${file}` : ''}`, icon: 'envelope-simple', who: roleName(get().role) }],
            documents: file ? [{ name: file, kind: 'Client drawing', at: nowIso().slice(0, 10) }] : [],
          };
          set((s) => ({ projects: [p, ...s.projects] }));
          get().notify(`Enquiry ${id} created`);
          return id;
        },

        startEstimate: (projectId, spec, itemName, file) => {
          const p = get().projects.find((x) => x.id === projectId)!;
          const estId = 'E-' + projectId.slice(2);
          if (!get().estimates.some((e) => e.id === estId)) {
            const e: Estimate = {
              id: estId,
              projectId,
              rev: 1,
              margin: 35,
              overheadPct: OVERHEAD_PCT,
              overheadBase: 'labour',
              wastePct: 15,
              items: [],
              status: 'draft',
              leadWeeks: 14,
              validDays: 30,
              schedule: [
                { label: 'Deposit on approval', pct: 50 },
                { label: 'Before delivery', pct: 40 },
                { label: 'After installation', pct: 10 },
              ],
              token: Math.random().toString(36).slice(2, 10),
            };
            set((s) => ({ estimates: [...s.estimates, e] }));
          }
          const itemId = get().addItem(estId, spec, itemName);
          if (file)
            get().editItem(estId, itemId, (it) => {
              it.drawing = { file, rev: 'A', extracted: nowIso() };
              // A real extraction flags what it could not read; mimic that on a couple of parts.
              it.parts.forEach((pt, i) => {
                pt.conf = [96, 94, 91, 91, 88][i] ?? (pt.name.startsWith('Handle') ? 66 : pt.name === 'Back' ? 74 : 92);
                pt.checked = pt.conf >= 80;
                if (pt.conf < 80) pt.note = pt.name === 'Back' ? 'Back thickness not shown on the drawing' : 'Position read from a note, not a dimension';
              });
            });
          patchProject(projectId, { estimateId: estId, stage: Math.max(p.stage, 1) });
          evt(projectId, file ? `Parts extracted from ${file} and estimate started` : `Estimate started: ${itemName}`, 'calculator');
        },

        sendQuote: (projectId) => {
          const e = estimateFor(projectId);
          const p = get().projects.find((x) => x.id === projectId)!;
          if (!e) return;
          const total = totalFor(e);
          get().editEstimate(e.id, (x) => {
            x.status = 'sent';
            x.sentAt = nowIso();
          });
          patchProject(projectId, { stage: Math.max(p.stage, 2), value: total, health: 'ok' });
          const c = get().clients.find((x) => x.id === p.client)!;
          evt(projectId, `Quote QT-${projectId.slice(2)} rev ${e.rev} sent to ${c.contact} through the portal`, 'paper-plane-tilt');
          set((s) => ({
            chases: [
              { id: uid('H'), proj: projectId, what: 'Quote sent, waiting for approval', sent: nowIso().slice(0, 10), n: 0, next: addDays(TODAY, 3).toISOString().slice(0, 10), tpl: 'Quote follow-up 1', auto: true },
              ...s.chases.filter((h) => h.proj !== projectId),
            ],
          }));
          get().notify('Quote sent. Follow-up 1 scheduled in 3 working days');
        },

        approveQuote: (token, sig) => {
          const e = get().estimates.find((x) => x.token === token);
          if (!e || e.status === 'approved') return;
          const p = get().projects.find((x) => x.id === e.projectId)!;
          const total = totalFor(e);
          get().editEstimate(e.id, (x) => {
            x.status = 'approved';
            x.approvedAt = nowIso();
            x.signature = { ...sig, at: nowIso(), ip: '81.2.69.160', ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '' };
          });
          patchProject(p.id, { stage: Math.max(p.stage, 3), value: total });
          evt(p.id, `Quote approved and signed in the portal by ${sig.name}`, 'signature', 'Client portal');
          const dep = e.schedule[0];
          const inv = raiseInvoice({ ...p, value: total }, dep.label, dep.pct, 14);
          evt(p.id, `Deposit invoice ${inv.ref} for £${inv.amt.toLocaleString('en-GB')} raised in Xero and emailed`, 'receipt', 'Xero');
          set((s) => ({ chases: s.chases.filter((h) => h.proj !== p.id) }));
        },

        advance: (projectId) => {
          const p = get().projects.find((x) => x.id === projectId)!;
          const e = estimateFor(projectId);
          const steps: Record<number, () => void> = {
            3: () => {
              const dep = get().invoices.find((i) => i.proj === projectId && i.status !== 'Paid');
              if (dep) set((s) => ({ invoices: s.invoices.map((i) => (i.ref === dep.ref ? { ...i, status: 'Paid' } : i)) }));
              evt(projectId, `Deposit ${dep ? dep.ref + ' ' : ''}paid (seen in Xero bank feed)`, 'bank', 'Xero');
            },
            4: () => {
              set((s) => ({
                projects: s.projects.map((x) =>
                  x.id === projectId ? { ...x, documents: [...x.documents, { name: `Workshop drawings ${projectId} rev A.pdf`, kind: 'Workshop drawings', rev: 'A', at: nowIso().slice(0, 10) }] } : x,
                ),
              }));
              evt(projectId, 'Workshop drawings rev A approved in the portal', 'files', 'Client portal');
            },
            5: () => evt(projectId, 'Samples approved: veneer, finish sheen and metalwork', 'check-circle', 'Client portal'),
            6: () => evt(projectId, `Production started. Cutting list of ${e?.items.reduce((a, i) => a + i.parts.length, 0) ?? 0} parts issued to the workshop`, 'hammer', 'Daniel Okafor'),
            7: () => {
              const sched = e?.schedule.find((x) => /deliver|ship/i.test(x.label));
              if (sched) {
                const inv = raiseInvoice(p, sched.label, sched.pct, 7);
                evt(projectId, `${sched.label} invoice ${inv.ref} raised`, 'receipt', 'Xero');
              }
              evt(projectId, 'Delivered. Delivery note signed', 'truck', 'Joe Brannigan');
            },
            8: () => evt(projectId, 'Installed and snagged. Client signed off in the app', 'check-circle', 'Joe Brannigan'),
            9: () => {
              const invoiced = get().invoices.filter((i) => i.proj === projectId).reduce((a, i) => a + i.amt, 0);
              const ref = nextRef(get().invoices, 'INV-');
              const amt = Math.max(0, p.value - invoiced);
              set((s) => ({ invoices: [{ ref, proj: projectId, client: p.client, amt, due: addDays(nowIso(), 14).toISOString().slice(0, 10), status: 'Sent', label: 'Final' }, ...s.invoices] }));
              evt(projectId, `Final invoice ${ref} for £${amt.toLocaleString('en-GB')} raised`, 'receipt', 'Xero');
            },
          };
          steps[p.stage]?.();
          if (p.stage >= 3 && p.stage < 10) patchProject(projectId, { stage: p.stage + 1 });
        },

        sendChase: (chaseId) => {
          const h = get().chases.find((x) => x.id === chaseId);
          if (!h) return;
          set((s) => ({ chases: s.chases.map((x) => (x.id === chaseId ? { ...x, n: x.n + 1, sent: TODAY.toISOString().slice(0, 10), next: addDays(TODAY, 7).toISOString().slice(0, 10) } : x)) }));
          evt(h.proj, `${h.tpl} sent`, 'paper-plane-tilt');
          get().notify(`${h.tpl} sent and filed to ${h.proj}`);
        },
        sendEmail: (projectId, subject) => {
          if (projectId) evt(projectId, `Email sent: ${subject}`, 'paper-plane-tilt');
          get().notify(`Sent and filed${projectId ? ' to ' + projectId : ''}`);
        },
        logCompliance: (id) => {
          set((s) => ({
            compliance: s.compliance.map((c) =>
              c.id === id ? { ...c, last: TODAY.toISOString().slice(0, 10), next: addDays(TODAY, freqDays(c.freq)).toISOString().slice(0, 10) } : c,
            ),
          }));
          get().notify('Logged as done today, evidence attached');
        },
        readMail: (id) => set((s) => ({ inbox: s.inbox.map((m) => (m.id === id ? { ...m, unread: false } : m)) })),
      };
    },
    {
      name: 'brackenbury-demo',
      version: 3,
      partialize: ({ toast, ...rest }) => rest,
      migrate: () => fresh() as unknown as Store,
    },
  ),
);

export function roleName(r: Role) {
  return { director: 'Director', office: 'Harriet Cole', workshop: 'Daniel Okafor', fitter: 'Joe Brannigan', subcontractor: 'Subcontractor', client: 'Client' }[r];
}

// Convenience selectors
export const useProject = (id: string) => useStore((s) => s.projects.find((p) => p.id === id));
export const useClient = (id?: string) => useStore((s) => s.clients.find((c) => c.id === id));
export const useEstimateFor = (projectId: string) => useStore((s) => s.estimates.find((e) => e.projectId === projectId));

/** Live value of a project: the estimate total while it is being priced, the contract value after. */
export function liveValue(s: Pick<DemoState, 'estimates' | 'prices' | 'rates'>, p: Project) {
  if (p.stage <= 1 && p.estimateId) {
    const e = s.estimates.find((x) => x.id === p.estimateId);
    if (e && e.items.length) return round10(costEstimate(e, s.prices, s.rates).price);
  }
  return p.value;
}

export type { Operation, Subcontract, Extra };
