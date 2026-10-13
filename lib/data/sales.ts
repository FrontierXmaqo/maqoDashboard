// Residential and C&I sales loaders, reading from their own Lark Bases. Server-only, read-only, CEO-only.
// Never throws: a table that can't be read becomes a warning and an empty list.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { CI_BASE, RESI_BASE, RESI_SALES_BASE, RESI_STAGES, type CiTarget, type ResiProject, type ResiSale, type SalesData } from '../sales-model.ts';
import { cached } from './cache.ts';
import { datetime, display, num, single, users } from './parse.ts';
import { fixturesEnabled } from './fixtures.ts';

const RESI_2026 = 'tblMhiNP4OO3h3oA';
const RESI_SALES = 'tblDTh0lmtTgrwH1'; // 🎉Sales Declaration_Resi New Case FYE26
const CI_TARGETS = 'tbliUv5oMV1AVWCS';
const CI_SE = 'tblpBSsofNilaC3G'; // SE 2026

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));
const yearOf = (ms: number | null) => (ms == null ? null : new Date(ms + 8 * 3600_000).getUTCFullYear());

function read(base: string, table: string): Promise<LarkRecord[]> {
  if (fixturesEnabled()) return Promise.resolve([]);
  return cached(`sales:${table}`, READ_CACHE_SECONDS, () => searchAllRecords(base, table, { automatic_fields: true }));
}

/** Field names differ in case between the yearly tables; first non-empty match wins. */
const pick = (f: Record<string, unknown>, ...names: string[]) => names.map((n) => f[n]).find((v) => v != null && v !== '');

export function mapResi(rec: LarkRecord, fixedYear: number | null): ResiProject {
  const f = rec.fields ?? {};
  const installedAt = datetime(pick(f, 'EXECUTED DATE INSTALLATION ( DAY 1)', 'Executed Date Installation'));
  const progress = num(f['Progress']);
  const stageNo = num(f['Stage No.']);
  return {
    id: rec.record_id,
    code: display(pick(f, 'PROJECT CODE', 'Project Code')),
    client: display(pick(f, 'APPLICATION NAME', 'Application Name')),
    sales: users(pick(f, 'SALES PIC', 'Sales Pic')),
    kwp: num(pick(f, 'SYSTEM SIZE(KWP)', 'System Size (kWp)')),
    // The 2026 table rarely fills PROJECT STATUS; its Progress formula (1 = all stages done) does the job.
    status: single(pick(f, 'PROJECT STATUS', 'Status'))?.toUpperCase() ?? (progress == null ? null : progress >= 1 ? 'COMPLETED' : 'IN PROGRESS'),
    // The Flow field does not come back from the API, so the Stage No. formula stands in for it.
    stage: display(pick(f, 'FLOW', 'Flow')) || (stageNo ? RESI_STAGES[stageNo - 1] ?? `Stage ${stageNo}` : ''),
    year: fixedYear ?? yearOf(installedAt),
    createdAt: rec.created_time ?? null,
    installedAt,
    events: [
      ...['SITE VISIT DATE', 'SITE VISIT 2ND'].map((k) => ({ kind: 'Site visit' as const, at: datetime(f[k]) })),
      ...['EXECUTED DATE INSTALLATION ( DAY 1)', 'EXECUTED DATE INSTALLATION (DAY 2)'].map((k) => ({ kind: 'Installation' as const, at: datetime(f[k]) })),
    ].filter((e): e is { kind: 'Site visit' | 'Installation'; at: number } => e.at != null),
    team: ['SALES PIC', 'LEADER', 'PIC SITE VISIT', 'PIC SUPERVISER'].flatMap((k) => users(f[k])),
  };
}

export function mapTarget(rec: LarkRecord): CiTarget {
  const f = rec.fields ?? {};
  return {
    sales: users(f['SC']),
    target: num(f['Sales Target (RM)']),
    achievement: num(f['Sales Achivement']) ?? 0,
    closedKwp: num(f['Closes Sales (kWp)']) ?? 0,
    hotRm: num(f['Sales Pipeline (Hot Lead)']) ?? 0,
    pipelineRm: num(f['Pipeline (exclude Close Case)']) ?? 0,
    pipelineKwp: num(f['Pipeline (kWp)']) ?? 0,
    closedN: 0,
  };
}

export function mapResiSale(rec: LarkRecord): ResiSale {
  const f = rec.fields ?? {};
  return {
    id: rec.record_id,
    sales: users(f['Sales PIC']),
    price: num(f['Selling Price']) ?? 0,
    kwp: num(f['System Size (kWp)']),
    // Deposit date is when the sale counts; fall back to when the case was declared.
    at: datetime(f['Deposit Payment Date']) ?? datetime(f['Date Created']) ?? rec.created_time ?? null,
  };
}

export async function loadResi(): Promise<SalesData<{ projects: ResiProject[]; sales: ResiSale[] }>> {
  // Projects: 2026 only, by the CEO Office's choice. Sales and prices: the Sales Declaration table.
  const warnings: string[] = [];
  const [projects, sales] = await Promise.all([
    read(RESI_BASE, RESI_2026).catch((e) => (warnings.push(`Could not read "PROJECT RESIDENTIAL 2026": ${describe(e)}`), [])),
    read(RESI_SALES_BASE, RESI_SALES).catch((e) => (warnings.push(`Could not read "Sales Declaration_Resi": ${describe(e)}`), [])),
  ]);
  return { generatedAt: Date.now(), rows: { projects: projects.map((r) => mapResi(r, 2026)), sales: sales.map(mapResiSale) }, warnings };
}

/** Closed Sales cases per Sales PIC open_id. SE 2026 is the table the Target lookups sum, so counts match. */
export function closedCounts(recs: LarkRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of recs) {
    const f = r.fields ?? {};
    if (!(single(f['Client Status']) ?? '').trim().toLowerCase().startsWith('closed')) continue;
    const id = users(f['Sales PIC'])[0]?.openId;
    if (id) m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

export async function loadCi(): Promise<SalesData<CiTarget[]>> {
  // The Target table holds the C&I team's own per-person totals, so the dashboard shows the same numbers.
  const warnings: string[] = [];
  const [targets, cases] = await Promise.all([
    read(CI_BASE, CI_TARGETS).catch((e) => (warnings.push(`Could not read the C&I "Target" table: ${describe(e)}`), [])),
    read(CI_BASE, CI_SE).catch((e) => (warnings.push(`Could not count closed deals from "SE 2026": ${describe(e)}`), [])),
  ]);
  const closed = closedCounts(cases);
  return { generatedAt: Date.now(), rows: targets.map(mapTarget).map((t) => ({ ...t, closedN: closed.get(t.sales[0]?.openId ?? '') ?? 0 })), warnings };
}
