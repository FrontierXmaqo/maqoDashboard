// Residential and C&I sales loaders, reading from their own Lark Bases. Server-only, read-only, CEO-only.
// Never throws: a table that can't be read becomes a warning and an empty list.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { CI_BASE, RESI_BASE, ciStatus, type CiCase, type CiTarget, type ResiProject, type SalesData } from '../sales-model.ts';
import { cached } from './cache.ts';
import { datetime, display, num, single, users } from './parse.ts';
import { fixturesEnabled } from './fixtures.ts';

const RESI_2026 = 'tblMhiNP4OO3h3oA';
const CI_CASES = 'tblSVoYfNQq4BoDm'; // (Overall)SC
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

export function mapCi(rec: LarkRecord): CiCase {
  const f = rec.fields ?? {};
  const kwp = num(f['System Size (kWp)']);
  const rmPerKwp = num(f['RM/kWP']);
  const statusRaw = single(f['Client Status']);
  return {
    id: rec.record_id,
    client: display(f['Client Name']),
    sales: users(f['Sales PIC']),
    kwp,
    rmPerKwp,
    total: num(f['Total (RM)']) ?? (kwp != null && rmPerKwp != null ? kwp * rmPerKwp : null),
    status: ciStatus(statusRaw),
    statusRaw,
    year: Number(single(f['Year'])) || yearOf(datetime(f['Case Entry Date'])),
    workflow: display(f['SC Workflow']),
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

export async function loadCi(): Promise<SalesData<{ cases: CiCase[]; targets: CiTarget[] }>> {
  const warnings: string[] = [];
  const get = async <T,>(table: string, label: string, map: (r: LarkRecord) => T) => {
    try {
      return (await read(CI_BASE, table)).map(map);
    } catch (e) {
      warnings.push(`Could not read "${label}": ${describe(e)}`);
      return [];
    }
  };
  const [cases, targets] = await Promise.all([
    get(CI_CASES, '(Overall)SC', mapCi),
    get(CI_TARGETS, 'Target', (r): CiTarget => ({ sales: users(r.fields?.['SC']), target: num(r.fields?.['Sales Target (RM)']) })),
  ]);
  return { generatedAt: Date.now(), rows: { cases, targets }, warnings };
}
