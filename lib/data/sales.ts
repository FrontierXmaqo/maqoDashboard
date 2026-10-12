// Residential and C&I sales loaders, reading from their own Lark Bases. Server-only, read-only, CEO-only.
// Never throws: a table that can't be read becomes a warning and an empty list.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { CI_BASE, RESI_BASE, type CiTarget, type ResiProject, type SalesData } from '../sales-model.ts';
import { cached } from './cache.ts';
import { datetime, display, num, single, users } from './parse.ts';
import { fixturesEnabled } from './fixtures.ts';

const RESI_2026 = 'tblMhiNP4OO3h3oA';
const CI_TARGETS = 'tbliUv5oMV1AVWCS';

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
    // No price column exists yet; these are the names the team is likely to give it.
    price: num(pick(f, 'SELLING PRICE (RM)', 'Selling Price (RM)', 'SELLING PRICE', 'Selling Price', 'PRICE (RM)', 'TOTAL PRICE (RM)')),
    // The 2026 table rarely fills PROJECT STATUS; its Progress formula (1 = all stages done) does the job.
    status: single(pick(f, 'PROJECT STATUS', 'Status'))?.toUpperCase() ?? (progress == null ? null : progress >= 1 ? 'COMPLETED' : 'IN PROGRESS'),
    // The Flow field does not come back from the API, so the Stage No. formula stands in for it.
    stage: display(pick(f, 'FLOW', 'Flow')) || (stageNo != null ? `Stage ${stageNo}` : ''),
    year: fixedYear ?? yearOf(installedAt),
    createdAt: rec.created_time ?? null,
    installedAt,
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
  };
}

export async function loadResi(): Promise<SalesData<ResiProject[]>> {
  // 2026 only, by the CEO Office's choice: the older table lacks sizes and prices.
  try {
    return { generatedAt: Date.now(), rows: (await read(RESI_BASE, RESI_2026)).map((r) => mapResi(r, 2026)), warnings: [] };
  } catch (e) {
    return { generatedAt: Date.now(), rows: [], warnings: [`Could not read "PROJECT RESIDENTIAL 2026": ${describe(e)}`] };
  }
}

export async function loadCi(): Promise<SalesData<CiTarget[]>> {
  // The Target table holds the C&I team's own per-person totals, so the dashboard shows the same numbers.
  try {
    return { generatedAt: Date.now(), rows: (await read(CI_BASE, CI_TARGETS)).map(mapTarget), warnings: [] };
  } catch (e) {
    return { generatedAt: Date.now(), rows: [], warnings: [`Could not read the C&I "Target" table: ${describe(e)}`] };
  }
}
