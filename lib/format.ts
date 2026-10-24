// Formatting and date helpers. The demo runs on a fixed "today" so due dates and price ages
// in the seed data read the same whenever the prototype is opened.

export const TODAY = new Date('2026-10-21T09:00:00');

export const gbp = (v: number, dp = 0) =>
  '£' + Number(v || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const k = (v: number) =>
  v >= 1e6 ? '£' + (v / 1e6).toFixed(2) + 'm' : v >= 1e3 ? '£' + (v / 1e3).toFixed(1) + 'k' : gbp(v);

export const dt = (s: string | Date) =>
  new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const dshort = (s: string | Date) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const dtime = (s: string | Date) =>
  new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Whole days from the demo's today to the given date (negative = in the past). */
export const days = (s: string | Date) => Math.round((new Date(s).getTime() - TODAY.getTime()) / 864e5);

export const ini = (n: string) =>
  n
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2);

export const addDays = (d: Date | string, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** "Now" for new events: real wall-clock time, but never earlier than the demo's today. */
export const nowIso = () => new Date(Math.max(Date.now(), TODAY.getTime())).toISOString();

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);

export const round10 = (v: number) => Math.round(v / 10) * 10;
