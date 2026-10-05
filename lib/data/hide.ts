// Applies config/hidden.ts. Pure, unit-tested.

import { HIDDEN_PEOPLE } from '../../config/hidden.ts';
import type { Task } from '../types.ts';

export function hideConfigured(tasks: Task[], hidden: string[] = HIDDEN_PEOPLE.map((h) => h.openId)): { tasks: Task[]; hiddenTasks: number } {
  if (!hidden.length) return { tasks, hiddenTasks: 0 };
  const isHidden = (id: string) => hidden.includes(id);
  const kept = tasks
    .filter((t) => !t.assignees.some((u) => isHidden(u.openId)) && !t.accountable.some((u) => isHidden(u.openId)))
    .map((t) => (t.support.some((u) => isHidden(u.openId)) ? { ...t, support: t.support.filter((u) => !isHidden(u.openId)) } : t));
  return { tasks: kept, hiddenTasks: tasks.length - kept.length };
}

export const isHiddenPerson = (id: string) => HIDDEN_PEOPLE.some((h) => h.openId === id);
