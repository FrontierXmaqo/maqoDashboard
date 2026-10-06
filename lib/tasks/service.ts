// Create and update tasks in Lark, with permission checks. Server-only. Every rule here is
// enforced no matter what the browser sends.

import { CONTACTS_CACHE_SECONDS } from '../../config/app.ts';
import { mapDepartment } from '../../config/departments.ts';
import { tableForNewTask } from '../../config/task-sources.ts';
import { canEditTask, creatableDepartments } from '../auth/permissions.ts';
import { HttpError } from '../auth/request.ts';
import { cached, invalidate } from '../data/cache.ts';
import { F } from '../data/mapTask.ts';
import { fixtureFields, fixturesEnabled, fixtureWrite } from '../data/fixtures.ts';
import { writesEnabled } from '../data/snapshot.ts';
import { resolveSources } from '../data/sources.ts';
import { listFields } from '../lark/bitable.ts';
import { larkEnv } from '../lark/env.ts';
import { createRecord, updateRecord } from '../lark/writes.ts';
import type { Viewer } from '../model.ts';
import type { Snapshot } from '../types.ts';
import { toLarkFields, WRITABLE_FIELDS, type TaskInput } from './validate.ts';

function assertWritable(v: Viewer) {
  if (!writesEnabled()) throw new HttpError(503, 'Editing is switched off on this deployment.');
  if (v.role === 'employee') throw new HttpError(403, 'Employees can view tasks but not change them.');
}

/** Leaders assign Task Responsible within their departments. Support may be anyone known. */
function checkPeople(v: Viewer, snap: Snapshot, input: TaskInput, keep: string[] = []) {
  const known = new Set(snap.people.map((p) => p.openId));
  for (const id of [...(input.assignees ?? []), ...(input.support ?? [])]) {
    if (!known.has(id) && !keep.includes(id)) throw new HttpError(400, 'One of the chosen people is not in the org chart.');
  }
  if (v.role !== 'leader') return;
  for (const id of input.assignees ?? []) {
    if (keep.includes(id)) continue;
    const dept = snap.people.find((p) => p.openId === id)?.dept;
    if (!dept || !v.depts.includes(dept)) throw new HttpError(403, 'Leaders can only assign tasks to people in their own departments.');
  }
}

const onlyWritable = (fields: Record<string, unknown>) => {
  for (const k of Object.keys(fields)) if (!WRITABLE_FIELDS.has(k)) throw new HttpError(500, `Refusing to write field "${k}".`);
  return fields;
};

/** The Department field and option to write for a new task, using options that already exist. */
async function departmentValue(tableId: string, dept: string): Promise<[string, unknown]> {
  const fields = fixturesEnabled()
    ? fixtureFields()
    : await cached(`fields:${tableId}`, CONTACTS_CACHE_SECONDS, () => listFields(larkEnv().baseToken, tableId));
  const field = fields.find((f) => f.field_name === F.department) ?? fields.find((f) => f.field_name === F.departments);
  if (!field) throw new HttpError(409, 'This Lark table has no Department field, so the new task would have no department.');
  const option = (field.property?.options ?? []).find((o) => mapDepartment(o.name) === dept);
  if (!option) throw new HttpError(409, `The Lark ${field.field_name} field has no option for ${dept}. Add it in Lark first.`);
  return [field.field_name, field.type === 4 ? [option.name] : option.name];
}

export async function createTask(v: Viewer, snap: Snapshot, input: TaskInput & { department?: string }): Promise<{ id: string }> {
  assertWritable(v);
  const dept = input.department ?? '';
  if (!creatableDepartments(v).includes(dept)) throw new HttpError(403, 'You can only create tasks in departments you lead.');
  checkPeople(v, snap, input);
  const fields = onlyWritable(toLarkFields({ status: 'Not yet started', ...input }, { previousStatus: null, now: Date.now(), creating: true }));
  const src = tableForNewTask(dept, (await resolveSources()).tasks);
  const [deptField, deptValue] = await departmentValue(src.tableId, dept);
  const all = { ...fields, [deptField]: deptValue }; // Department is written only on create.
  const recordId = fixturesEnabled() ? fixtureWrite(src.tableId, null, all) : await createRecord(larkEnv().baseToken, src.tableId, all);
  invalidate('base:');
  return { id: `${src.tableId}:${recordId}` };
}

export async function updateTask(v: Viewer, snap: Snapshot, id: string, input: TaskInput): Promise<void> {
  assertWritable(v);
  const [tableId, recordId] = id.split(':');
  if (!(await resolveSources()).tasks.some((s) => s.tableId === tableId) || !recordId) throw new HttpError(400, 'Unknown task.');
  const task = snap.tasks.find((t) => t.id === id);
  if (!task) throw new HttpError(404, 'This task no longer exists in Lark. Refresh the page.');
  if (!canEditTask(v, task)) throw new HttpError(403, 'You can only edit tasks in departments you lead.');
  checkPeople(v, snap, input, [...task.assignees, ...task.support].map((p) => p.openId));
  const fields = onlyWritable(toLarkFields(input, { previousStatus: task.statusRaw, now: Date.now() }));
  if (!Object.keys(fields).length) return;
  if (fixturesEnabled()) fixtureWrite(tableId, recordId, fields);
  else await updateRecord(larkEnv().baseToken, tableId, recordId, fields);
  invalidate('base:');
}
