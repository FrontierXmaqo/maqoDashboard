// Loads everything the dashboard shows from Lark, server-side only. Never throws: a table or
// the org chart that can't be read becomes a warning and an empty list, and the page renders.

import { CONTACTS_CACHE_SECONDS, READ_CACHE_SECONDS, freeThreshold, overloadedAt } from '../../config/app.ts';
import { mapDepartment } from '../../config/departments.ts';
import { PROJECTS_SOURCE, TASK_SOURCES } from '../../config/task-sources.ts';
import { LarkConfigError, larkEnv } from '../lark/env.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { listAllDepartments, listDepartmentUsers, type LarkDepartment } from '../lark/contacts.ts';
import type { Person, Project, Snapshot, Task } from '../types.ts';
import { cached } from './cache.ts';
import { mapTask } from './mapTask.ts';
import { display } from './parse.ts';
import { fixtureRecords, fixturesEnabled } from './fixtures.ts';

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function readTable(tableId: string): Promise<LarkRecord[]> {
  if (fixturesEnabled()) return fixtureRecords(tableId);
  const { baseToken } = larkEnv();
  return cached(`base:${tableId}`, READ_CACHE_SECONDS, () => searchAllRecords(baseToken, tableId));
}

function mapProject(rec: LarkRecord): Project {
  const f = rec.fields ?? {};
  return {
    id: rec.record_id,
    name: display(f['PROJECT NAME']) || 'Not set',
    type: display(f['PROJECT TYPE']),
    state: display(f['STATE']),
    capacity: display(f['CAPACITY (kWp)']),
    cycleStatus: display(f['CURRENT CYCLE STATUS (O&M)']),
  };
}

type OrgChart = { people: Person[]; departments: LarkDepartment[] };

async function loadOrgChart(): Promise<OrgChart> {
  if (fixturesEnabled()) return { people: [], departments: [] };
  return cached('contacts', CONTACTS_CACHE_SECONDS, async () => {
    const departments = (await listAllDepartments()).filter((d) => !d.status?.is_deleted);
    const byId = new Map(departments.map((d) => [d.open_department_id, d]));
    const deptName = (d: LarkDepartment) => d.i18n_name?.en_us || d.name || '';

    // Nearest department up the tree whose name maps to an app department.
    const appDeptOf = (id: string): string | null => {
      let cur = byId.get(id);
      for (let i = 0; cur && i < 20; i++) {
        const m = mapDepartment(deptName(cur));
        if (m) return m;
        cur = cur.parent_department_id ? byId.get(cur.parent_department_id) : undefined;
      }
      return null;
    };

    const people = new Map<string, Person>();
    for (const deptId of ['0', ...departments.map((d) => d.open_department_id)]) {
      for (const u of await listDepartmentUsers(deptId)) {
        if (!u.open_id || u.status?.is_resigned || u.status?.is_exited || people.has(u.open_id)) continue;
        const ids = u.department_ids ?? [];
        people.set(u.open_id, {
          openId: u.open_id,
          name: u.en_name || u.name || 'Not set',
          avatarUrl: u.avatar?.avatar_72 || null,
          jobTitle: u.job_title ?? '',
          larkDepartments: ids.map((id) => byId.get(id)).filter(Boolean).map((d) => deptName(d!)),
          dept: ids.map(appDeptOf).find((d) => d != null) ?? null,
          source: 'contacts',
        });
      }
    }
    return { people: [...people.values()], departments };
  });
}

/** People seen on tasks but missing from the org chart; department taken from their tasks. */
function peopleFromTasks(tasks: Task[], known: Set<string>): Person[] {
  const seen = new Map<string, { p: Person; depts: Map<string, number> }>();
  for (const t of tasks) {
    for (const u of [...t.assignees, ...t.accountable, ...t.support]) {
      if (known.has(u.openId)) continue;
      let e = seen.get(u.openId);
      if (!e) {
        e = { p: { ...u, jobTitle: '', dept: null, larkDepartments: [], source: 'tasks' }, depts: new Map() };
        seen.set(u.openId, e);
      }
      if (!e.p.avatarUrl && u.avatarUrl) e.p.avatarUrl = u.avatarUrl;
      for (const d of t.departments) e.depts.set(d, (e.depts.get(d) ?? 0) + 1);
    }
  }
  return [...seen.values()].map(({ p, depts }) => {
    const top = [...depts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { ...p, dept: top ? top[0] : null };
  });
}

function emptySnapshot(warning: string): Snapshot {
  return {
    generatedAt: Date.now(),
    tasks: [],
    projects: [],
    people: [],
    departmentMap: [],
    sources: [...TASK_SOURCES, PROJECTS_SOURCE].map((s) => ({ ...s, count: null })),
    warnings: [warning],
    freeThreshold: freeThreshold(),
    overloadedAt: overloadedAt(),
    writesEnabled: false,
  };
}

/** Writes are off unless explicitly switched on, so a deployment can never write by accident. */
export function writesEnabled(): boolean {
  return fixturesEnabled() || process.env.LARK_WRITES_ENABLED === '1';
}

export async function loadSnapshot(): Promise<Snapshot> {
  if (!fixturesEnabled()) {
    try {
      larkEnv();
    } catch (e) {
      if (e instanceof LarkConfigError) return emptySnapshot(`Lark is not connected on this deployment. ${e.message}.`);
      throw e;
    }
  }
  const warnings: string[] = [];
  const sources: Snapshot['sources'] = [];

  const taskLists = await Promise.all(
    TASK_SOURCES.map(async (src) => {
      try {
        const recs = await readTable(src.tableId);
        sources.push({ ...src, count: recs.length });
        return recs.map((r) => mapTask(r, src));
      } catch (e) {
        sources.push({ ...src, count: null });
        warnings.push(`Could not read tasks from "${src.label}": ${describe(e)}`);
        return [];
      }
    }),
  );
  const tasks = taskLists.flat();

  let projects: Project[] = [];
  try {
    const recs = await readTable(PROJECTS_SOURCE.tableId);
    projects = recs.map(mapProject);
    sources.push({ ...PROJECTS_SOURCE, count: recs.length });
  } catch (e) {
    sources.push({ ...PROJECTS_SOURCE, count: null });
    warnings.push(`Could not read projects from "${PROJECTS_SOURCE.label}": ${describe(e)}`);
  }

  let org: OrgChart = { people: [], departments: [] };
  if (!fixturesEnabled()) {
    try {
      org = await loadOrgChart();
      if (!org.people.length) warnings.push('The org chart returned nobody. Check the app’s contacts visibility range.');
    } catch (e) {
      warnings.push(`Could not read the org chart, so people come from task assignees only: ${describe(e)}`);
    }
  }
  const known = new Set(org.people.map((p) => p.openId));
  const people = [...org.people, ...peopleFromTasks(tasks, known)];

  const larkNames = new Set<string>();
  for (const d of org.departments) larkNames.add(d.i18n_name?.en_us || d.name || '');
  for (const t of tasks) for (const d of t.rawDepartments) larkNames.add(d);
  larkNames.delete('');
  const departmentMap = [...larkNames].sort().map((lark) => ({ lark, app: mapDepartment(lark) }));

  return {
    generatedAt: Date.now(),
    tasks,
    projects,
    people,
    departmentMap,
    sources,
    warnings,
    freeThreshold: freeThreshold(),
    overloadedAt: overloadedAt(),
    writesEnabled: writesEnabled(),
  };
}
