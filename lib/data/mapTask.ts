// Turns one Lark task record into an app Task. Pure, so it is unit-tested.

import { mapDepartment } from '../../config/departments.ts';
import type { Priority, Stage, Task } from '../types.ts';
import type { LarkRecord } from '../lark/records.ts';
import { datetime, links, multi, single, text, users } from './parse.ts';

export const F = {
  title: 'Task',
  assignee: 'Task Responsible',
  accountable: 'Task Accountable',
  support: 'Task Support',
  department: 'Department',
  departments: 'Departments',
  start: 'Start date',
  due: 'Estimate Deadline',
  completedAt: 'Actual End Date',
  priority: 'Priority',
  notes: 'Progress notes',
  summary: 'Task summary',
  project: 'PROJECT NAME (handover)',
  status: 'Task Status',
} as const;

export function stageOf(statusRaw: string | null): { stage: Stage; omStage: boolean } {
  switch (statusRaw) {
    case 'Not yet started':
      return { stage: 'todo', omStage: false };
    case 'Ongoing':
      return { stage: 'ongoing', omStage: false };
    case 'O&M Stage':
      return { stage: 'ongoing', omStage: true };
    case 'Stalled':
      return { stage: 'stalled', omStage: false };
    case 'Completed':
      return { stage: 'done', omStage: false };
    default:
      // Empty or an option the app doesn't know: "Not set", counted as open.
      return { stage: 'notset', omStage: false };
  }
}

export function priorityOf(raw: string | null): Priority {
  if (raw === 'Important') return 'high';
  if (raw === 'Normal') return 'normal';
  return null;
}

export function mapTask(rec: LarkRecord, source: { tableId: string; label: string }): Task {
  const f = rec.fields ?? {};
  const rawDepartments = Array.from(new Set([...multi(f[F.department]), ...multi(f[F.departments])]));
  const departments = Array.from(
    new Set(rawDepartments.map((d) => mapDepartment(d)).filter((d): d is NonNullable<typeof d> => d != null)),
  );
  const statusRaw = single(f[F.status]);
  return {
    id: `${source.tableId}:${rec.record_id}`,
    recordId: rec.record_id,
    sourceTableId: source.tableId,
    sourceLabel: source.label,
    title: text(f[F.title]) || 'Untitled task',
    assignees: users(f[F.assignee]),
    accountable: users(f[F.accountable]),
    support: users(f[F.support]),
    departments,
    rawDepartments,
    start: datetime(f[F.start]),
    due: datetime(f[F.due]),
    completedAt: datetime(f[F.completedAt]),
    priority: priorityOf(single(f[F.priority])),
    notes: text(f[F.notes]),
    summary: text(f[F.summary]),
    projectIds: links(f[F.project]),
    statusRaw,
    ...stageOf(statusRaw),
  };
}
