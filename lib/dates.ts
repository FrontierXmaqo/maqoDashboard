// Day arithmetic in Asia/Kuala_Lumpur. A "day number" is days since 1970-01-01 in KL time,
// so comparisons ignore the time of day and the viewer's own timezone.

import { TIMEZONE } from '../config/app.ts';

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let fmt: Intl.DateTimeFormat | null = null;
function ymd(ms: number): string {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(ms);
}

export function isoToDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return Number.NaN;
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
}

export const dayToIso = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);

/** KL day number of a timestamp, or NaN when missing. */
export function klDay(ms: number | null | undefined): number {
  if (ms == null || !Number.isFinite(ms)) return Number.NaN;
  return isoToDay(ymd(ms));
}

export const todayDay = (now = Date.now()) => klDay(now);

export function fd(n: number): string {
  if (!Number.isFinite(n)) return 'Not set';
  const d = new Date(n * 864e5);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

export function fdy(n: number): string {
  if (!Number.isFinite(n)) return 'Not set';
  const d = new Date(n * 864e5);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const weekday = (n: number) => DAYS[new Date(n * 864e5).getUTCDay()];

export function weekRange(t0: number): [number, number] {
  const dow = new Date(t0 * 864e5).getUTCDay();
  const a = t0 - ((dow + 6) % 7);
  return [a, a + 6];
}

export function monthRange(t0: number, off = 0): [number, number] {
  const d = new Date(t0 * 864e5);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + off;
  return [Math.round(Date.UTC(y, m, 1) / 864e5), Math.round(Date.UTC(y, m + 1, 0) / 864e5)];
}

export function quarterRange(t0: number): [number, number] {
  const d = new Date(t0 * 864e5);
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) * 3;
  return [Math.round(Date.UTC(y, q, 1) / 864e5), Math.round(Date.UTC(y, q + 3, 0) / 864e5)];
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const people = (n: number) => `${n}${n === 1 ? ' person' : ' people'}`;
