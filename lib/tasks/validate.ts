// Turns an edit from the browser into Lark field values, rejecting anything malformed.
// Pure, so it is unit-tested. Value formats follow the Lark record data structure doc:
// text = string, single select = option name, person = [{ id }], date = ms timestamp,
// null = clear the field.

import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../../config/schema.ts';
import { F } from '../data/mapTask.ts';

export type TaskInput = {
  title?: string;
  status?: string;
  assignees?: string[];
  support?: string[];
  /** YYYY-MM-DD in Kuala Lumpur time, or '' to clear. */
  start?: string;
  due?: string;
  /** 'Important' | 'Normal' | '' to clear. */
  priority?: string;
  notes?: string;
  summary?: string;
};

export class InvalidInput extends Error {}

const MAX_TEXT = 10_000;

/** Midnight in Kuala Lumpur (UTC+8, no daylight saving) as a ms timestamp. */
export function klDateToMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new InvalidInput(`"${iso}" is not a date.`);
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]) - 8 * 3600_000;
  if (!Number.isFinite(ms)) throw new InvalidInput(`"${iso}" is not a date.`);
  return ms;
}

const people = (ids: unknown, label: string) => {
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string' || !/^ou_[\w-]+$/.test(x))) throw new InvalidInput(`${label} must be a list of Lark users.`);
  const uniq = [...new Set(ids as string[])];
  return uniq.length ? uniq.map((id) => ({ id })) : null;
};

const longText = (v: unknown, label: string) => {
  if (typeof v !== 'string') throw new InvalidInput(`${label} must be text.`);
  if (v.length > MAX_TEXT) throw new InvalidInput(`${label} is too long.`);
  return v.trim() ? v : null;
};

/**
 * Lark fields for the changed values only. `now` sets Actual End Date when the status
 * becomes Completed and the task was not already Completed.
 */
export function toLarkFields(input: TaskInput, opts: { previousStatus: string | null; now: number; creating?: boolean }): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim()) throw new InvalidInput('Give the task a name.');
    if (input.title.length > 300) throw new InvalidInput('Task name is too long (300 characters max).');
    f[F.title] = input.title.trim();
  } else if (opts.creating) throw new InvalidInput('Give the task a name.');

  if (input.status !== undefined) {
    if (!TASK_STATUS_OPTIONS.includes(input.status)) throw new InvalidInput(`Status must be one of: ${TASK_STATUS_OPTIONS.join(', ')}.`);
    f[F.status] = input.status;
    if (input.status === 'Completed' && opts.previousStatus !== 'Completed') f[F.completedAt] = opts.now;
  }
  if (input.assignees !== undefined) f[F.assignee] = people(input.assignees, 'Task Responsible');
  if (input.support !== undefined) f[F.support] = people(input.support, 'Task Support');
  for (const [key, field] of [['start', F.start], ['due', F.due]] as const) {
    const v = input[key];
    if (v === undefined) continue;
    if (typeof v !== 'string') throw new InvalidInput('Dates must be YYYY-MM-DD.');
    f[field] = v === '' ? null : klDateToMs(v);
  }
  if (typeof f[F.start] === 'number' && typeof f[F.due] === 'number' && (f[F.due] as number) < (f[F.start] as number)) {
    throw new InvalidInput('The deadline is before the start date.');
  }
  if (input.priority !== undefined) {
    if (input.priority !== '' && !PRIORITY_OPTIONS.includes(input.priority)) throw new InvalidInput(`Priority must be ${PRIORITY_OPTIONS.join(' or ')}.`);
    f[F.priority] = input.priority || null;
  }
  if (input.notes !== undefined) f[F.notes] = longText(input.notes, 'Progress notes');
  if (input.summary !== undefined) f[F.summary] = longText(input.summary, 'Task summary');
  if (opts.creating) for (const k of Object.keys(f)) if (f[k] === null) delete f[k];
  return f;
}

/** Fields the app may write. Department is written only when creating a task. */
export const WRITABLE_FIELDS = new Set<string>([F.title, F.status, F.assignee, F.support, F.start, F.due, F.priority, F.notes, F.summary, F.completedAt]);
