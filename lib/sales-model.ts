// Residential and C&I sales: shapes, Lark links and summaries. Client-safe, no Lark access.

import type { PersonRef } from './types.ts';

export const RESI_BASE = 'Ec88b000TaIsdGsEznLl8i2dgve';
export const CI_BASE = 'YLOSbdnx6a53O9sVwCflo8adgad';
export const RESI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${RESI_BASE}?table=tblMhiNP4OO3h3oA&view=vewuXiMDmU`;
export const CI_LARK_URL = `https://bsgyt70achks.sg.larksuite.com/base/${CI_BASE}?table=tblSVoYfNQq4BoDm`;

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
