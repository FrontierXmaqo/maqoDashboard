import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareTable } from '../lib/schema/compare.ts';
import { TASK_FIELDS, TASK_IGNORED_FIELDS, TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, FIELD_TYPE } from '../config/schema.ts';
import type { LarkField } from '../lib/lark/bitable.ts';

const opts = (names: string[]) => ({ options: names.map((name) => ({ name })) });

function goodTaskFields(): LarkField[] {
  const f = (field_name: string, type: number, property: LarkField['property'] = null): LarkField => ({
    field_id: 'fld' + field_name.replace(/\W/g, ''),
    field_name,
    type,
    property,
  });
  return [
    f('Task', FIELD_TYPE.Text),
    f('Task Responsible', FIELD_TYPE.User),
    f('Task Accountable', FIELD_TYPE.User),
    f('Task Support', FIELD_TYPE.User),
    f('Department', FIELD_TYPE.MultiSelect),
    f('Departments', FIELD_TYPE.MultiSelect),
    f('Start date', FIELD_TYPE.DateTime),
    f('Estimate Deadline', FIELD_TYPE.DateTime),
    f('Actual End Date', FIELD_TYPE.DateTime),
    f('Priority', FIELD_TYPE.SingleSelect, opts(PRIORITY_OPTIONS)),
    f('Progress notes', FIELD_TYPE.Text),
    f('Task summary', FIELD_TYPE.Text),
    f('PROJECT NAME (handover)', FIELD_TYPE.DuplexLink, { table_id: 'tbl5QmCHTiIgjUlE' }),
    f('Task Status', FIELD_TYPE.SingleSelect, opts(TASK_STATUS_OPTIONS)),
    f('Overdue', FIELD_TYPE.Formula),
    f('Images', FIELD_TYPE.Attachment),
  ];
}

test('a matching table has no issues and ignores listed fields', () => {
  const r = compareTable('t', 'T', TASK_FIELDS, goodTaskFields(), TASK_IGNORED_FIELDS);
  assert.deepEqual(r.issues, []);
  assert.deepEqual(r.unmapped, []);
});

test('reports a missing field, a retyped field and a likely rename', () => {
  const fields = goodTaskFields()
    .filter((f) => f.field_name !== 'Task Support' && f.field_name !== 'Estimate Deadline')
    .map((f) => (f.field_name === 'Start date' ? { ...f, type: FIELD_TYPE.Text } : f));
  fields.push({ field_id: 'x', field_name: 'Estimated Deadline', type: FIELD_TYPE.DateTime });
  const r = compareTable('t', 'T', TASK_FIELDS, fields, TASK_IGNORED_FIELDS);
  const byField = Object.fromEntries(r.issues.map((i) => [i.field, i]));
  assert.equal(byField['Task Support'].level, 'error');
  assert.match(byField['Task Support'].message, /^Missing\.$/);
  assert.match(byField['Estimate Deadline'].message, /renamed to "Estimated Deadline"/);
  assert.match(byField['Start date'].message, /expected DateTime, found Text/);
  assert.deepEqual(r.unmapped, []);
});

test('reports status options that differ', () => {
  const fields = goodTaskFields().map((f) =>
    f.field_name === 'Task Status' ? { ...f, property: opts(['Not yet started', 'Ongoing', 'Done', 'Stalled', 'O&M Stage']) } : f,
  );
  const r = compareTable('t', 'T', TASK_FIELDS, fields, TASK_IGNORED_FIELDS);
  const msgs = r.issues.filter((i) => i.field === 'Task Status').map((i) => `${i.level}: ${i.message}`);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0], /^error: Options missing in Lark: "Completed"/);
  assert.match(msgs[1], /^warning: Extra options .*"Done"/);
});

test('a missing optional Departments field is only a warning', () => {
  const fields = goodTaskFields().filter((f) => f.field_name !== 'Departments');
  const r = compareTable('t', 'T', TASK_FIELDS, fields, TASK_IGNORED_FIELDS);
  assert.deepEqual(r.issues.map((i) => i.level), ['warning']);
});

test('a link field pointing at the wrong table is an error', () => {
  const fields = goodTaskFields().map((f) =>
    f.field_name === 'PROJECT NAME (handover)' ? { ...f, property: { table_id: 'tblOther', table_name: 'MASTER SUMMARY INFO' } } : f,
  );
  const r = compareTable('t', 'T', TASK_FIELDS, fields, TASK_IGNORED_FIELDS);
  assert.match(r.issues[0].message, /Links to table tblOther \("MASTER SUMMARY INFO"\)/);
});

test('unknown extra fields are listed as unmapped', () => {
  const fields = [...goodTaskFields(), { field_id: 'z', field_name: 'Budget', type: FIELD_TYPE.Number }];
  const r = compareTable('t', 'T', TASK_FIELDS, fields, TASK_IGNORED_FIELDS);
  assert.deepEqual(r.unmapped, ['Budget']);
});
