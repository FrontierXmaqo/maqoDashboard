// Residential and C&I sales: shapes, Lark links and summaries. Client-safe, no Lark access.

import type { PersonRef } from './types.ts';

export const RESI_BASE = 'Ec88b000TaIsdGsEznLl8i2dgve';
export const CI_BASE = 'YLOSbdnx6a53O9sVwCflo8adgad';
export const RESI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${RESI_BASE}?table=tblMhiNP4OO3h3oA&view=vewuXiMDmU`;
export const CI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${CI_BASE}?table=tbliUv5oMV1AVWCS&view=vewh2hE6ug`;

export const RESI_SALES_BASE = 'Hp9sbVJg8aHPIZs4U2FlpCMMgpd';
export const RESI_SALES_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${RESI_SALES_BASE}?table=tblDTh0lmtTgrwH1`;

/**
 * Residential team target, RM per month, as set by the CEO Office. The financial year starts in September.
 * shortcut: edited in code, move to a target table in Lark when the team wants to change it themselves.
 */
export const RESI_MONTHLY_TARGET = 1_000_000;
const FY_START_MONTH = 8; // September, 0-based

/** One signed residential case from the Sales Declaration table. */
export type ResiSale = { id: string; sales: PersonRef[]; price: number; kwp: number | null; at: number | null };

const KL = 8 * 3600_000;
const klYm = (ms: number) => {
  const d = new Date(ms + KL);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};

/** Start (ms) and label of the financial year containing `ms`, e.g. 1 Sep 2026 and "FYE 2026/27". */
export function financialYear(ms: number): { start: number; label: string } {
  const { y, m } = klYm(ms);
  const fy = m >= FY_START_MONTH ? y : y - 1;
  return { start: Date.UTC(fy, FY_START_MONTH, 1) - KL, label: `FYE ${fy}/${String(fy + 1).slice(2)}` };
}

export type ResiSalesStats = {
  fyLabel: string;
  monthRm: number;
  monthCases: number;
  fyRm: number;
  fyKwp: number;
  fyCases: number;
  fyTarget: number;
  /** Share of the financial year gone, for the "where we should be today" mark. */
  fyPace: number;
  /** Last 12 calendar months, oldest first. */
  byMonth: { label: string; rm: number; cases: number }[];
  /** This financial year, per Sales PIC, highest selling price first. */
  byPerson: { p: PersonRef; cases: number; rm: number; kwp: number }[];
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function resiSalesStats(list: ResiSale[], now: number): ResiSalesStats {
  const { start, label } = financialYear(now);
  const cur = klYm(now);
  const fy = list.filter((s) => s.at != null && s.at >= start && s.at <= now);
  const month = list.filter((s) => s.at != null && klYm(s.at).y === cur.y && klYm(s.at).m === cur.m);
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(cur.y, cur.m - 11 + i, 1));
    const inM = list.filter((s) => s.at != null && klYm(s.at).y === d.getUTCFullYear() && klYm(s.at).m === d.getUTCMonth());
    return { label: `${MON[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, rm: inM.reduce((a, s) => a + s.price, 0), cases: inM.length };
  });
  const people = new Map<string, ResiSalesStats['byPerson'][number]>();
  for (const s of fy) {
    const p = s.sales[0] ?? { openId: '', name: 'No sales PIC', avatarUrl: null };
    const row = people.get(p.openId) ?? { p, cases: 0, rm: 0, kwp: 0 };
    row.cases++;
    row.rm += s.price;
    row.kwp += s.kwp ?? 0;
    people.set(p.openId, row);
  }
  return {
    fyLabel: label,
    monthRm: month.reduce((a, s) => a + s.price, 0),
    monthCases: month.length,
    fyRm: fy.reduce((a, s) => a + s.price, 0),
    fyKwp: fy.reduce((a, s) => a + (s.kwp ?? 0), 0),
    fyCases: fy.length,
    fyTarget: RESI_MONTHLY_TARGET * 12,
    fyPace: Math.min(1, (now - start) / (365.25 * 864e5)),
    byMonth,
    byPerson: [...people.values()].sort((a, b) => b.rm - a.rm),
  };
}

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

export type ResiPersonRow = { p: PersonRef; projects: number; kwp: number; ongoing: number; completed: number; cancelled: number };

/** Per salesperson, for one year's projects. Unassigned projects are grouped under "No sales PIC". */
export function resiByPerson(list: ResiProject[]): ResiPersonRow[] {
  const m = new Map<string, ResiPersonRow>();
  for (const r of list) {
    const p = r.sales[0] ?? { openId: '', name: 'No sales PIC', avatarUrl: null };
    const row = m.get(p.openId) ?? { p, projects: 0, kwp: 0, ongoing: 0, completed: 0, cancelled: 0 };
    row.projects++;
    if ((r.status ?? '').startsWith('CANCEL')) row.cancelled++;
    else {
      row.kwp += r.kwp ?? 0;
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
  resi: { year: number; kwp: number; projects: number; ongoing: number; completed: number; sales: ResiSalesStats } | null;
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
export function salesSummary(resi: ResiProject[], resiSales: ResiSale[], targets: CiTarget[], warnings: string[], now = Date.now()): SalesSummary {
  const rs = resiSalesStats(resiSales, now);
  const latest = (ys: (number | null)[]) => Math.max(0, ...ys.filter((y): y is number => y != null)) || null;
  const ry = latest(resi.map((r) => r.year));
  const rl = resi.filter((r) => r.year === ry && !(r.status ?? '').startsWith('CANCEL'));
  const ci = targets.filter((t) => t.sales[0]);
  const sum = (f: (t: CiTarget) => number) => ci.reduce((s, t) => s + f(t), 0);
  const target = sum((t) => t.target ?? 0);
  const closedRm = sum((t) => t.achievement);
  const alerts: SalesSummary['alerts'] = [];
  if (rs.fyRm < rs.fyTarget * rs.fyPace * 0.9) alerts.push({ text: `Residential ${rs.fyLabel}: RM ${(rs.fyRm / 1e6).toFixed(2)}M sold, about RM ${((rs.fyTarget * rs.fyPace) / 1e6).toFixed(2)}M expected by now`, href: '/residential' });
  if (target) alerts.push({ text: `C&I sales RM ${(closedRm / 1e6).toFixed(2)}M of RM ${(target / 1e6).toFixed(1)}M target (${Math.round((closedRm / target) * 100)}%)`, href: '/ci' });
  return {
    at: now,
    alerts,
    resi: ry
      ? {
          year: ry,
          kwp: rl.reduce((s, r) => s + (r.kwp ?? 0), 0),
          projects: rl.length,
          ongoing: rl.filter(resiOpen).length,
          completed: rl.filter((r) => r.status === 'COMPLETED').length,
          sales: rs,
        }
      : null,
    people: [
      ...rs.byPerson.filter((r) => r.p.openId).map((r) => ({ p: r.p, dept: 'Residential' as const, projects: r.cases, kwp: r.kwp, closedRm: r.rm, hotRm: 0 })),
      ...ci.map((t) => ({ p: t.sales[0], dept: 'C&I' as const, projects: t.closedN, kwp: t.closedKwp, closedRm: t.achievement, hotRm: t.hotRm })),
    ],
    ci: ci.length ? { closedRm, closedKwp: sum((t) => t.closedKwp), closedN: sum((t) => t.closedN), target, hotRm: sum((t) => t.hotRm), pipelineRm: sum((t) => t.pipelineRm) } : null,
    warnings,
  };
}
