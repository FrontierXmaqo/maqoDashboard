// The Lark tables to read on this deployment. The live Base uses the IDs in
// config/task-sources.ts. The test Base is a copy of the live one, and copied tables get new
// IDs, so there each table is found by its ID if it exists, otherwise by its name.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { PROJECTS_SOURCE, TASK_SOURCES, type TaskSource } from '../../config/task-sources.ts';
import { listTables, type LarkTable } from '../lark/bitable.ts';
import { larkEnv, usingTestBase } from '../lark/env.ts';
import { cached } from './cache.ts';
import { fixturesEnabled } from './fixtures.ts';

export type Sources = { tasks: TaskSource[]; projects: TaskSource };

/** Lower-case letters and digits only, so "✅ (PH)Task Breakdown" matches "(PH) Task Breakdown". */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** The table in this Base for a configured source: same ID, else same name (by its label). */
export function matchTable(src: TaskSource, tables: LarkTable[]): TaskSource {
  if (tables.some((t) => t.table_id === src.tableId)) return src;
  const byName = tables.find((t) => norm(t.name) === norm(src.label));
  return byName ? { ...src, tableId: byName.table_id } : src;
}

/** Lists the Base's tables, trying twice: one failed call must not break the whole page. */
async function listTablesWithRetry(baseToken: string): Promise<LarkTable[]> {
  try {
    return await listTables(baseToken);
  } catch {
    return listTables(baseToken);
  }
}

/**
 * Throws if the test Base's tables cannot be listed. The caller must not fall back to the
 * live IDs there: they do not exist in the test Base.
 */
export async function resolveSources(): Promise<Sources> {
  if (fixturesEnabled() || !usingTestBase()) return { tasks: TASK_SOURCES, projects: PROJECTS_SOURCE };
  const { baseToken } = larkEnv();
  const tables = await cached('tables', READ_CACHE_SECONDS, () => listTablesWithRetry(baseToken));
  return { tasks: TASK_SOURCES.map((s) => matchTable(s, tables)), projects: matchTable(PROJECTS_SOURCE, tables) };
}
