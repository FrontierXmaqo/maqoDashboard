import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidInput, klDateToMs, toLarkFields, WRITABLE_FIELDS } from '../lib/tasks/validate.ts';
import { canEditTask, creatableDepartments } from '../lib/auth/permissions.ts';
import { tableForNewTask } from '../config/task-sources.ts';

const ceo = { role: 'ceo' as const, openId: 'ou_c', depts: [] };
const leader = { role: 'leader' as const, openId: 'ou_l', depts: ['C&I', 'Engineering'] };
const emp = { role: 'employee' as const, openId: 'ou_e', depts: ['O&M'] };

test('permissions: CEO any task, leader only intersecting departments, employee never', () => {
  assert.equal(canEditTask(ceo, { departments: [] }), true);
  assert.equal(canEditTask(leader, { departments: ['Engineering', 'O&M'] }), true);
  assert.equal(canEditTask(leader, { departments: ['O&M'] }), false);
  assert.equal(canEditTask(leader, { departments: [] }), false);
  assert.equal(canEditTask(emp, { departments: ['O&M'] }), false);
  assert.deepEqual(creatableDepartments(leader), ['C&I', 'Engineering']);
  assert.deepEqual(creatableDepartments(emp), []);
  assert.equal(creatableDepartments(ceo).length, 9);
});

test('new tasks go to the O&M table for O&M, the PH table otherwise', () => {
  assert.equal(tableForNewTask('O&M').tableId, 'tblG3imQ2abeqfC0');
  assert.equal(tableForNewTask('C&I').tableId, 'tbllh9KcfhidHupv');
});

test('fields: exact Lark names and formats; Completed sets Actual End Date once', () => {
  const now = 1_790_000_000_000;
  const f = toLarkFields(
    { title: ' Fix inverter ', status: 'Completed', assignees: ['ou_abcd1'], support: [], due: '2026-10-07', priority: 'Important', notes: 'ok', summary: '' },
    { previousStatus: 'Ongoing', now },
  );
  assert.deepEqual(f, {
    Task: 'Fix inverter',
    'Task Status': 'Completed',
    'Actual End Date': now,
    'Task Responsible': [{ id: 'ou_abcd1' }],
    'Task Support': null,
    'Estimate Deadline': Date.UTC(2026, 9, 6, 16),
    Priority: 'Important',
    'Progress notes': 'ok',
    'Task summary': null,
  });
  assert.equal('Actual End Date' in toLarkFields({ status: 'Completed' }, { previousStatus: 'Completed', now }), false);
  for (const k of Object.keys(f)) assert.ok(WRITABLE_FIELDS.has(k), k);
});

test('fields: rejects bad input', () => {
  const o = { previousStatus: null, now: 0 };
  assert.throws(() => toLarkFields({ status: 'Done' }, o), InvalidInput);
  assert.throws(() => toLarkFields({ status: '' }, o), InvalidInput);
  assert.throws(() => toLarkFields({ priority: 'High' }, o), InvalidInput);
  assert.throws(() => toLarkFields({ assignees: ['bob'] }, o), InvalidInput);
  assert.throws(() => toLarkFields({ title: '  ' }, o), InvalidInput);
  assert.throws(() => toLarkFields({ due: '7 Oct' }, o), InvalidInput);
  assert.throws(() => toLarkFields({ start: '2026-10-08', due: '2026-10-07' }, o), InvalidInput);
  assert.throws(() => toLarkFields({}, { ...o, creating: true }), InvalidInput);
  assert.deepEqual(toLarkFields({ due: '' }, o), { 'Estimate Deadline': null });
});

test('KL midnight conversion', () => {
  assert.equal(new Date(klDateToMs('2026-10-05')).toISOString(), '2026-10-04T16:00:00.000Z');
});
