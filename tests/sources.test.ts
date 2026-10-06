import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSources } from '../lib/data/sources.ts';
import type { LarkField } from '../lib/lark/bitable.ts';

const f = (...names: string[]): LarkField[] => names.map((field_name, i) => ({ field_id: `f${i}`, field_name, type: 1 }));
const TASK = f('Task', 'Task Responsible', 'Task Status', 'Department');

test('every table with the task fields is read; configured tables come first', () => {
  const tables = [
    { table_id: 'tblMkt', name: '(Marketing) Task Breakdown' },
    { table_id: 'tblOKR', name: '🎯 Team OKR Tasks' },
    { table_id: 'tblCopyPH', name: '✅ (PH)Task Breakdown' },
    { table_id: 'tblCopyProj', name: 'O&M CNI HANDOVER,CONTACT INFO' },
    { table_id: 'tblBroken', name: 'Broken' },
  ];
  const fields: Record<string, LarkField[] | null> = { tblMkt: TASK, tblOKR: f('Objective', 'Task'), tblCopyPH: TASK, tblBroken: null };
  const s = pickSources(tables, (id) => (id in fields ? fields[id] : []));
  // The copied PH table is found by name and comes first; O&M is not in this Base.
  assert.deepEqual(s.tasks.map((t) => t.tableId), ['tblCopyPH', 'tblMkt']);
  assert.equal(s.tasks[0].createDefault, true);
  assert.deepEqual(s.tasks[1], { tableId: 'tblMkt', label: '(Marketing) Task Breakdown', createFor: ['Marketing'] });
  assert.equal(s.projects.tableId, 'tblCopyProj');
  assert.deepEqual(s.skipped, [
    { name: 'Team OKR Tasks', reason: 'no Task Responsible, Task Status, Department fields' },
    { name: 'Broken', reason: 'could not read its fields' },
  ]);
});
