// Derived view of a Snapshot: per-task due labels, per-person workload, per-project progress,
// and what the current viewer is allowed to see. Pure; runs in the browser and in tests.

import { DEPARTMENTS } from '../config/departments.ts';
import { klDay, plural, todayDay, fd } from './dates.ts';
import type { Person, PersonRef, Project, Snapshot, Stage, Task } from './types.ts';

export const NOT_SET = 'Not set';

export type Tone = 'g' | 'b' | 'a' | 'r' | 'n';

export const STAGES: { k: Stage; label: string; tone: Tone; step: number }[] = [
  { k: 'todo', label: 'To do', tone: 'n', step: 1 },
  { k: 'ongoing', label: 'Ongoing', tone: 'b', step: 2 },
  { k: 'stalled', label: 'Stalled', tone: 'r', step: 2 },
  { k: 'done', label: 'Complete', tone: 'g', step: 3 },
  { k: 'notset', label: 'Not set', tone: 'n', step: 0 },
];
export const stageMeta = (k: Stage) => STAGES.find((s) => s.k === k) ?? STAGES[4];

export const PRIO = {
  high: { label: 'Important', tone: 'r' as Tone, rank: 0 },
  normal: { label: 'Normal', tone: 'n' as Tone, rank: 1 },
  none: { label: NOT_SET, tone: 'n' as Tone, rank: 2 },
};
export const prioMeta = (p: Task['priority']) => (p === 'high' ? PRIO.high : p === 'normal' ? PRIO.normal : PRIO.none);

export type StatusKey = 'free' | 'working' | 'overloaded';
export const STATUS: Record<StatusKey, { label: string; tone: Tone }> = {
  free: { label: 'Free', tone: 'g' },
  working: { label: 'Working', tone: 'b' },
  overloaded: { label: 'Overloaded', tone: 'r' },
};

export type Viewer = {
  role: 'ceo' | 'leader' | 'employee';
  openId: string | null;
  /** Departments a leader leads, or an employee belongs to. Ignored for the CEO. */
  depts: string[];
};

export const CEO_VIEWER: Viewer = { role: 'ceo', openId: null, depts: [] };

export type TaskX = Task & {
  dueDay: number;
  /** Days until due (negative = late). 9999 when there is no deadline, for sorting. */
  dd: number;
  done: boolean;
  overdue: boolean;
  dueLabel: string;
  dueCls: '' | 'c-r' | 'c-a' | 'muted';
  assigneeNames: string;
  projectNames: string;
  deptLabel: string;
};

export type PersonX = Person & {
  deptLabel: string;
  mine: TaskX[];
  open: TaskX[];
  n: number;
  key: StatusKey;
  loadPct: number;
  cur: TaskX | undefined;
  next: TaskX | undefined;
  overdueN: number;
};

export type ProjectX = Project & {
  pt: TaskX[];
  doneN: number;
  /** Ongoing, including stalled. */
  ogN: number;
  stalledN: number;
  /** To do, including Not set. */
  nsN: number;
  remainN: number;
  overdueN: number;
};

export type Model = {
  viewer: Viewer;
  t0: number;
  freeThreshold: number;
  overloadedAt: number;
  tasks: TaskX[];
  people: PersonX[];
  personById: Map<string, PersonX>;
  projects: ProjectX[];
  projectById: Map<string, ProjectX>;
  sTasks: TaskX[];
  sPeople: PersonX[];
  sProjects: ProjectX[];
  /** Departments the viewer can pick from, in standard order, with "Not set" last if used. */
  depts: string[];
  visTask: (t: TaskX) => boolean;
};

const names = (list: PersonRef[]) => (list.length ? list.map((p) => p.name).join(', ') : NOT_SET);

export function statusKey(n: number, free: number, over: number): StatusKey {
  if (n >= over) return 'overloaded';
  if (n <= free) return 'free';
  return 'working';
}

const STAGE_ORDER: Record<Stage, number> = { ongoing: 0, stalled: 1, todo: 2, notset: 3, done: 4 };

export function build(snap: Snapshot, viewer: Viewer = CEO_VIEWER, now = Date.now()): Model {
  const t0 = todayDay(now);
  const free = snap.freeThreshold;
  const over = snap.overloadedAt;
  const projById = new Map(snap.projects.map((p) => [p.id, p]));

  const tasks: TaskX[] = snap.tasks.map((t) => {
    const dueDay = klDay(t.due);
    const dd = dueDay - t0;
    const done = t.stage === 'done';
    const overdue = !done && Number.isFinite(dd) && dd < 0;
    let dueLabel = fd(dueDay);
    let dueCls: TaskX['dueCls'] = '';
    if (!Number.isFinite(dd)) {
      dueLabel = NOT_SET;
      dueCls = 'muted';
    } else if (overdue) {
      dueLabel = `${plural(-dd, 'day')} late`;
      dueCls = 'c-r';
    } else if (!done && dd === 0) {
      dueLabel = 'Today';
      dueCls = 'c-a';
    } else if (!done && dd === 1) {
      dueLabel = 'Tomorrow';
      dueCls = 'c-a';
    }
    const projectNames = t.projectIds.map((id) => projById.get(id)?.name).filter(Boolean).join(', ');
    return {
      ...t,
      dueDay,
      dd: Number.isFinite(dd) ? dd : 9999,
      done,
      overdue,
      dueLabel,
      dueCls,
      assigneeNames: names(t.assignees),
      projectNames: projectNames || 'No project',
      deptLabel: t.departments.length ? t.departments.join(', ') : NOT_SET,
    };
  });

  const people: PersonX[] = snap.people.map((p) => {
    const mine = tasks.filter((t) => t.assignees.some((a) => a.openId === p.openId));
    const open = mine.filter((t) => !t.done);
    const n = open.length;
    const cur = open.slice().sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || a.dd - b.dd)[0];
    const next = open.slice().sort((a, b) => a.dd - b.dd)[0];
    return {
      ...p,
      deptLabel: p.dept ?? NOT_SET,
      mine,
      open,
      n,
      key: statusKey(n, free, over),
      loadPct: Math.round((n / over) * 100),
      cur,
      next: next && next.dd !== 9999 ? next : undefined,
      overdueN: open.filter((t) => t.overdue).length,
    };
  });
  const personById = new Map(people.map((p) => [p.openId, p]));

  const projects: ProjectX[] = snap.projects.map((p) => {
    const pt = tasks.filter((t) => t.projectIds.includes(p.id));
    const doneN = pt.filter((t) => t.stage === 'done').length;
    const stalledN = pt.filter((t) => t.stage === 'stalled').length;
    const ogN = pt.filter((t) => t.stage === 'ongoing').length + stalledN;
    const nsN = pt.filter((t) => t.stage === 'todo' || t.stage === 'notset').length;
    return { ...p, pt, doneN, ogN, stalledN, nsN, remainN: pt.length - doneN, overdueN: pt.filter((t) => t.overdue).length };
  });
  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Visibility. Phase 3 supplies real viewers; the CEO sees everything.
  const inDepts = (ds: string[]) => ds.some((d) => viewer.depts.includes(d));
  const visTask = (t: TaskX) => {
    if (viewer.role === 'ceo') return true;
    if (viewer.openId && t.assignees.some((a) => a.openId === viewer.openId)) return true;
    return inDepts(t.departments);
  };
  const visPerson = (p: PersonX) => viewer.role === 'ceo' || (p.dept != null && viewer.depts.includes(p.dept)) || p.openId === viewer.openId;
  const sTasks = tasks.filter(visTask);
  const sPeople = people.filter(visPerson);
  const sProjects = viewer.role === 'ceo' ? projects : projects.filter((p) => p.pt.some(visTask));

  const used = new Set<string>([...people.map((p) => p.deptLabel), ...tasks.flatMap((t) => (t.departments.length ? t.departments : [NOT_SET]))]);
  const base = viewer.role === 'ceo' ? [...DEPARTMENTS] : DEPARTMENTS.filter((d) => viewer.depts.includes(d));
  const depts: string[] = [...base];
  if (viewer.role === 'ceo' && used.has(NOT_SET)) depts.push(NOT_SET);

  return {
    viewer,
    t0,
    freeThreshold: free,
    overloadedAt: over,
    tasks,
    people,
    personById,
    projects,
    projectById,
    sTasks,
    sPeople,
    sProjects,
    depts,
    visTask,
  };
}

/** Tasks in a department; "Not set" matches tasks with no department. */
export const taskInDept = (t: TaskX, d: string) => (d === NOT_SET ? t.departments.length === 0 : t.departments.includes(d));
export const personInDept = (p: PersonX, d: string) => p.deptLabel === d;
