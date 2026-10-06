// The Lark tables to read. Every table in the Base that has the task fields is read, so a
// new department table shows up without a code change. Tables in config/task-sources.ts
// come first (their order decides which copy of a duplicated row is kept) and are found by
// ID, or by name when the Base is a copy whose tables got new IDs.

import { CONTACTS_CACHE_SECONDS, READ_CACHE_SECONDS } from '../../config/app.ts';
import { mapDepartment } from '../../config/departments.ts';
import { PROJECTS_SOURCE, TASK_SOURCES, type TaskSource } from '../../config/task-sources.ts';
import { listFields, listTables, type LarkField, type LarkTable } from '../lark/bitable.ts';
import { larkEnv } from '../lark/env.ts';
import { cached } from './cache.ts';
import { fixturesEnabled } from './fixtures.ts';

export type Sources = {
  tasks: TaskSource[];
  projects: TaskSource;
  /** Tables in the Base that are not read, with the reason. Shown on Settings and in check-schema. */
  skipped: { name: string; reason: string }[];
};

/** A table counts as a task table when it has all of these, plus Department or Departments. */
export const TASK_TABLE_MARKERS = ['Task', 'Task Responsible', 'Task Status'];

/** Lower-case letters and digits only, so "✅ (PH)Task Breakdown" matches "(PH) Task Breakdown". */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Lark table names may start with an emoji; drop it for display. */
const cleanName = (s: string) => s.replace(/^[^\p{L}\p{N}(]+/u, '').trim() || s;

/** The table in this Base for a configured source: same ID, else same name (by its label). */
export function matchTable(src: TaskSource, tables: LarkTable[]): TaskSource | null {
  if (tables.some((t) => t.table_id === src.tableId)) return src;
  const byName = tables.find((t) => norm(t.name) === norm(src.label));
  return byName ? { ...src, tableId: byName.table_id } : null;
}

/** Why a table is not a task table, or null when it is one. */
export function notTaskTable(fields: LarkField[]): string | null {
  const names = new Set(fields.map((f) => f.field_name));
  const missing = TASK_TABLE_MARKERS.filter((n) => !names.has(n));
  if (!names.has('Department') && !names.has('Departments')) missing.push('Department');
  return missing.length ? `no ${missing.join(', ')} field${missing.length > 1 ? 's' : ''}` : null;
}

/** Pure: decides which tables to read, given the Base's tables and each one's fields. */
/** `fieldsOf` returns null for a table whose fields could not be read. */
export function pickSources(tables: LarkTable[], fieldsOf: (tableId: string) => LarkField[] | null): Sources {
  const projects = matchTable(PROJECTS_SOURCE, tables) ?? PROJECTS_SOURCE;
  const configured = TASK_SOURCES.map((s) => matchTable(s, tables)).filter((s): s is TaskSource => s !== null);
  const taken = new Set([projects.tableId, ...configured.map((s) => s.tableId)]);
  const tasks = [...configured];
  const skipped: Sources['skipped'] = [];
  for (const t of tables) {
    if (taken.has(t.table_id)) continue;
    const f = fieldsOf(t.table_id);
    const reason = f ? notTaskTable(f) : 'could not read its fields';
    if (reason) {
      skipped.push({ name: cleanName(t.name), reason });
      continue;
    }
    const label = cleanName(t.name);
    const dept = mapDepartment(label);
    tasks.push({ tableId: t.table_id, label, ...(dept ? { createFor: [dept] } : {}) });
  }
  return { tasks, projects, skipped };
}

/** One failed call must not break the whole page, so each Lark read is tried twice. */
async function twice<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch {
    return load();
  }
}

/** Fields of a table, cached under the same key the task writer uses. */
export function tableFields(tableId: string): Promise<LarkField[]> {
  const { baseToken } = larkEnv();
  return cached(`fields:${tableId}`, CONTACTS_CACHE_SECONDS, () => twice(() => listFields(baseToken, tableId)));
}

/** Throws if the Base's tables cannot be listed; callers then fall back to the configured IDs. */
export async function resolveSources(): Promise<Sources> {
  if (fixturesEnabled()) return { tasks: TASK_SOURCES, projects: PROJECTS_SOURCE, skipped: [] };
  const { baseToken } = larkEnv();
  const tables = await cached('tables', READ_CACHE_SECONDS, () => twice(() => listTables(baseToken)));
  const fields = new Map<string, LarkField[] | null>();
  await Promise.all(tables.map(async (t) => fields.set(t.table_id, await tableFields(t.table_id).catch(() => null))));
  return pickSources(tables, (id) => fields.get(id) ?? null);
}
