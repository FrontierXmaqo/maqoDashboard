// Residential and C&I sales: shapes, Lark links and summaries. Client-safe, no Lark access.

import type { PersonRef } from './types.ts';

export const RESI_BASE = 'Ec88b000TaIsdGsEznLl8i2dgve';
export const CI_BASE = 'YLOSbdnx6a53O9sVwCflo8adgad';
export const RESI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${RESI_BASE}?table=tblMhiNP4OO3h3oA&view=vewuXiMDmU`;
export const CI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${CI_BASE}?table=tblSVoYfNQq4BoDm`;

/**
 * Residential has no target in Lark, so the team's yearly target lives here (one number for the team).
 * shortcut: edited in code, move to a Target table in the Residential Base when the team wants to edit it.
 */
export const RESI_TARGET: { year: number; rm: number | null; kwp: number | null } = { year: 2026, rm: null, kwp: null };

/** Fraction of the year gone by at `ms` (Malaysia time), for "where should we be today" marks. */
export function yearPace(ms: number): number {
  const d = new Date(ms + 8 * 3600_000);
  const y = d.getUTCFullYear();
  return (d.getTime() - Date.UTC(y, 0, 1)) / (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1));
}

export type ResiProject = {
  id: string;
  code: string;
  client: string;
  sales: PersonRef[];
  kwp: number | null;
  /** Selling price (RM), once the team adds the column in Lark. */
  price: number | null;
  /** COMPLETED / CANCEL BY CLIENT / NOT STARTED / SCHEDULE / PENDING / KIV, upper-cased. */
  status: string | null;
  stage: string;
  /** 2026 for the 2026 table; installation year for the 2022–2025 table. */
  year: number | null;
  createdAt: number | null;
  installedAt: number | null;
};

export type CiStatus = 'closed' | 'hot' | 'warm' | 'cold' | 'lost' | 'other';

export type CiCase = {
  id: string;
  client: string;
  sales: PersonRef[];
  kwp: number | null;
  rmPerKwp: number | null;
  total: number | null;
  status: CiStatus;
  statusRaw: string | null;
  year: number | null;
  workflow: string;
};

export type CiTarget = { sales: PersonRef[]; target: number | null };

export type SalesData<T> = { generatedAt: number; rows: T; warnings: string[] };

export function ciStatus(raw: string | null): CiStatus {
  const s = (raw ?? '').trim().toLowerCase();
  for (const k of ['closed', 'hot', 'warm', 'cold', 'lost'] as const) if (s.startsWith(k)) return k;
  return 'other';
}

// ---------- summaries (pure, unit-tested) ----------

const OPEN_RESI = (s: string | null) => s !== 'COMPLETED' && !(s ?? '').startsWith('CANCEL');

export type ResiPersonRow = { p: PersonRef; projects: number; kwp: number; rm: number; pricedKwp: number; ongoing: number; completed: number; cancelled: number };

/** Per salesperson, for one year's projects. Unassigned projects are grouped under "No sales PIC". */
export function resiByPerson(list: ResiProject[]): ResiPersonRow[] {
  const m = new Map<string, ResiPersonRow>();
  for (const r of list) {
    const p = r.sales[0] ?? { openId: '', name: 'No sales PIC', avatarUrl: null };
    const row = m.get(p.openId) ?? { p, projects: 0, kwp: 0, rm: 0, pricedKwp: 0, ongoing: 0, completed: 0, cancelled: 0 };
    row.projects++;
    if ((r.status ?? '').startsWith('CANCEL')) row.cancelled++;
    else {
      row.kwp += r.kwp ?? 0;
      if (r.price != null) {
        row.rm += r.price;
        row.pricedKwp += r.kwp ?? 0;
      }
      if (r.status === 'COMPLETED') row.completed++;
      else row.ongoing++;
    }
    m.set(p.openId, row);
  }
  return [...m.values()].sort((a, b) => b.kwp - a.kwp || b.projects - a.projects);
}

export const resiOpen = (r: ResiProject) => OPEN_RESI(r.status);

export type CiPersonRow = { p: PersonRef; closedRm: number; closedKwp: number; closedN: number; hotRm: number; warmRm: number; coldRm: number; lostN: number; target: number | null };

export function ciByPerson(cases: CiCase[], targets: CiTarget[]): CiPersonRow[] {
  const m = new Map<string, CiPersonRow>();
  const row = (p: PersonRef) => {
    let r = m.get(p.openId);
    if (!r) m.set(p.openId, (r = { p, closedRm: 0, closedKwp: 0, closedN: 0, hotRm: 0, warmRm: 0, coldRm: 0, lostN: 0, target: null }));
    return r;
  };
  for (const c of cases) {
    const r = row(c.sales[0] ?? { openId: '', name: 'No sales PIC', avatarUrl: null });
    if (c.status === 'closed') {
      r.closedRm += c.total ?? 0;
      r.closedKwp += c.kwp ?? 0;
      r.closedN++;
    } else if (c.status === 'hot') r.hotRm += c.total ?? 0;
    else if (c.status === 'warm') r.warmRm += c.total ?? 0;
    else if (c.status === 'cold') r.coldRm += c.total ?? 0;
    else if (c.status === 'lost') r.lostN++;
  }
  for (const t of targets) if (t.sales[0] && t.target != null) row(t.sales[0]).target = (row(t.sales[0]).target ?? 0) + t.target;
  // People with only status-less cases and no target add nothing to the table.
  return [...m.values()]
    .filter((r) => r.closedN || r.hotRm || r.warmRm || r.coldRm || r.lostN || r.target)
    .sort((a, b) => b.closedRm - a.closedRm || b.hotRm - a.hotRm);
}

/** The few numbers the CEO overview cards need, so the full rows stay off that page. */
export type SalesSummary = {
  resi: { year: number; kwp: number; projects: number; ongoing: number; completed: number; rm: number | null; target: { rm: number | null; kwp: number | null } } | null;
  ci: { year: number; closedRm: number; closedKwp: number; closedN: number; target: number; hotRm: number; hotN: number } | null;
  /** Salespeople with their latest-year numbers, so the CEO sees them even when the org chart can't. */
  people: { p: PersonRef; dept: 'Residential' | 'C&I'; projects: number; kwp: number; closedRm: number; hotRm: number }[];
  /** ms when read, for pace marks. */
  at: number;
  /** Data gaps and target misses the CEO should see under Needs attention. */
  alerts: { text: string; href: string }[];
  warnings: string[];
};

/** Targets with no salesperson are skipped, as on the C&I page, so both show the same total. */
export function salesSummary(resi: ResiProject[], cases: CiCase[], targets: CiTarget[], warnings: string[]): SalesSummary {
  const latest = (ys: (number | null)[]) => Math.max(0, ...ys.filter((y): y is number => y != null)) || null;
  const ry = latest(resi.map((r) => r.year));
  const rl = resi.filter((r) => r.year === ry && !(r.status ?? '').startsWith('CANCEL'));
  const cy = latest(cases.map((c) => c.year));
  const cl = cases.filter((c) => c.year === cy);
  const tot = (l: CiCase[]) => l.reduce((s, c) => s + (c.total ?? 0), 0);
  const closed = cl.filter((c) => c.status === 'closed');
  const hot = cl.filter((c) => c.status === 'hot');
  const alerts: SalesSummary['alerts'] = [];
  const target = targets.reduce((s, t) => s + (t.sales[0] ? t.target ?? 0 : 0), 0);
  if (cy && target) alerts.push({ text: `C&I closed RM ${Math.round(tot(closed) / 1e3)}k of RM ${(target / 1e6).toFixed(1)}M target (${Math.round((tot(closed) / target) * 100)}%)`, href: '/ci' });
  const noStatus = cl.filter((c) => c.status === 'other').length;
  if (noStatus) alerts.push({ text: `${noStatus} C&I cases in ${cy} have no client status`, href: '/ci' });
  return {
    at: Date.now(),
    alerts,
    resi: ry
      ? {
          year: ry,
          kwp: rl.reduce((s, r) => s + (r.kwp ?? 0), 0),
          projects: rl.length,
          ongoing: rl.filter(resiOpen).length,
          completed: rl.filter((r) => r.status === 'COMPLETED').length,
          rm: rl.some((r) => r.price != null) ? rl.reduce((s, r) => s + (r.price ?? 0), 0) : null,
          target: RESI_TARGET.year === ry ? { rm: RESI_TARGET.rm, kwp: RESI_TARGET.kwp } : { rm: null, kwp: null },
        }
      : null,
    people: [
      ...resiByPerson(resi.filter((r) => r.year === ry)).filter((r) => r.p.openId).map((r) => ({ p: r.p, dept: 'Residential' as const, projects: r.projects, kwp: r.kwp, closedRm: r.rm, hotRm: 0 })),
      ...ciByPerson(cl, []).filter((r) => r.p.openId).map((r) => ({ p: r.p, dept: 'C&I' as const, projects: r.closedN, kwp: r.closedKwp, closedRm: r.closedRm, hotRm: r.hotRm })),
    ],
    ci: cy ? { year: cy, closedRm: tot(closed), closedKwp: closed.reduce((s, c) => s + (c.kwp ?? 0), 0), closedN: closed.length, target, hotRm: tot(hot), hotN: hot.length } : null,
    warnings,
  };
}
