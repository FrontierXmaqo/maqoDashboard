// Who may write what. Pure; the API routes call these on every write, and the UI uses the
// same functions only to decide which buttons to show.

import { DEPARTMENTS } from '../../config/departments.ts';
import type { Viewer } from '../model.ts';
import type { Task } from '../types.ts';

/** CEO: any task. Leader: tasks whose departments include one they lead. Employee: none. */
export function canEditTask(v: Viewer, t: Pick<Task, 'departments'>): boolean {
  if (v.role === 'ceo') return true;
  if (v.role === 'leader') return t.departments.some((d) => v.depts.includes(d));
  return false;
}

/** Departments a viewer may create tasks in. */
export function creatableDepartments(v: Viewer): string[] {
  if (v.role === 'ceo') return [...DEPARTMENTS];
  if (v.role === 'leader') return DEPARTMENTS.filter((d) => v.depts.includes(d));
  return [];
}
