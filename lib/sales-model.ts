// Residential and C&I sales: shapes, Lark links and summaries. Client-safe, no Lark access.

import type { PersonRef } from './types.ts';

export const RESI_BASE = 'Ec88b000TaIsdGsEznLl8i2dgve';
export const CI_BASE = 'YLOSbdnx6a53O9sVwCflo8adgad';
export const RESI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${RESI_BASE}?table=tblMhiNP4OO3h3oA&view=vewuXiMDmU`;
export const CI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${CI_BASE}?table=tbliUv5oMV1AVWCS&view=vewh2hE6ug`;

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

/** One row of the C&I Target table: the team's own numbers per sales consultant (SC). */
export type CiTarget = {
  sales: PersonRef[];
  target: number | null;
  /** Sales Achivement (RM): closed sales. */
  achievement: number;
  closedKwp: number;
  hotRm: number;
  /** Pipeline (exclude Close Case), RM. */
  pipelineRm: number;
  pipelineKwp: number;
  /** Number of Closed Sales cases in SE 2026, the table the Target lookups read. */
  closedN: number;
};

export type SalesData<T> = { generatedAt: number; rows: T; warnings: string[] };

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

/** The few numbers the CEO overview cards need, so the full rows stay off that page. */
export type SalesSummary = {
  resi: { year: number; kwp: number; projects: number; ongoing: number; completed: number; rm: number | null; target: { rm: number | null; kwp: number | null } } | null;
  ci: { closedRm: number; closedKwp: number; closedN: number; target: number; hotRm: number; pipelineRm: number } | null;
  /** Salespeople with their latest-year numbers, so the CEO sees them even when the org chart can't. */
  people: { p: PersonRef; dept: 'Residential' | 'C&I'; projects: number; kwp: number; closedRm: number; hotRm: number }[];
  /** ms when read, for pace marks. */
  at: number;
  /** Data gaps and target misses the CEO should see under Needs attention. */
  alerts: { text: string; href: string }[];
  warnings: string[];
};

/** C&I rows with no salesperson are skipped, as on the C&I page, so both show the same totals. */
export function salesSummary(resi: ResiProject[], targets: CiTarget[], warnings: string[]): SalesSummary {
  const latest = (ys: (number | null)[]) => Math.max(0, ...ys.filter((y): y is number => y != null)) || null;
  const ry = latest(resi.map((r) => r.year));
  const rl = resi.filter((r) => r.year === ry && !(r.status ?? '').startsWith('CANCEL'));
  const ci = targets.filter((t) => t.sales[0]);
  const sum = (f: (t: CiTarget) => number) => ci.reduce((s, t) => s + f(t), 0);
  const target = sum((t) => t.target ?? 0);
  const closedRm = sum((t) => t.achievement);
  const alerts: SalesSummary['alerts'] = [];
  if (target) alerts.push({ text: `C&I sales RM ${(closedRm / 1e6).toFixed(2)}M of RM ${(target / 1e6).toFixed(1)}M target (${Math.round((closedRm / target) * 100)}%)`, href: '/ci' });
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
      ...ci.map((t) => ({ p: t.sales[0], dept: 'C&I' as const, projects: t.closedN, kwp: t.closedKwp, closedRm: t.achievement, hotRm: t.hotRm })),
    ],
    ci: ci.length ? { closedRm, closedKwp: sum((t) => t.closedKwp), closedN: sum((t) => t.closedN), target, hotRm: sum((t) => t.hotRm), pipelineRm: sum((t) => t.pipelineRm) } : null,
    warnings,
  };
}
