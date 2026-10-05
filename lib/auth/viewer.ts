// Who is looking, and what they may see. Pure functions, unit-tested.

import { CEO_OPEN_IDS, LEADERS } from '../../config/roles.ts';
import type { Viewer } from '../model.ts';
import type { Snapshot } from '../types.ts';

export type RoleConfig = { ceo: string[]; leaders: { openId: string; departments: string[] }[] };
const CONFIG: RoleConfig = { ceo: CEO_OPEN_IDS, leaders: LEADERS };

export function resolveViewer(
  openId: string,
  personDept: string | null,
  dev?: { role: Viewer['role']; depts: string[] },
  cfg: RoleConfig = CONFIG,
): Viewer {
  if (dev) return { role: dev.role, openId, depts: dev.role === 'ceo' ? [] : dev.depts };
  if (cfg.ceo.includes(openId)) return { role: 'ceo', openId, depts: [] };
  const lead = cfg.leaders.find((l) => l.openId === openId);
  if (lead && lead.departments.length) return { role: 'leader', openId, depts: [...lead.departments] };
  return { role: 'employee', openId, depts: personDept ? [personDept] : [] };
}

/**
 * Removes everything the viewer may not see before data leaves the server.
 * CEO: everything. Leader: their departments. Employee: own tasks plus own department.
 */
export function scopeSnapshot(snap: Snapshot, v: Viewer): Snapshot {
  if (v.role === 'ceo') return snap;
  const inDepts = (ds: string[]) => ds.some((d) => v.depts.includes(d));
  const tasks = snap.tasks.filter((t) => t.assignees.some((a) => a.openId === v.openId) || inDepts(t.departments));

  const openTotal = new Map<string, number>();
  for (const t of snap.tasks) {
    if (t.stage === 'done') continue;
    for (const a of t.assignees) openTotal.set(a.openId, (openTotal.get(a.openId) ?? 0) + 1);
  }
  const people = snap.people
    .filter((p) => p.openId === v.openId || (p.dept != null && v.depts.includes(p.dept)))
    .map((p) => ({ ...p, openTotal: openTotal.get(p.openId) ?? 0 }));

  const projectIds = new Set(tasks.flatMap((t) => t.projectIds));
  return {
    ...snap,
    tasks,
    people,
    projects: snap.projects.filter((p) => projectIds.has(p.id)),
    departmentMap: [],
  };
}
