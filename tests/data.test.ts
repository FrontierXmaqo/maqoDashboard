import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapTask, stageOf } from '../lib/data/mapTask.ts';
import { links, text, users, datetime, multi } from '../lib/data/parse.ts';
import { build, statusKey } from '../lib/model.ts';
import { mapDepartment } from '../config/departments.ts';
import { klDay } from '../lib/dates.ts';
import type { Snapshot } from '../lib/types.ts';

const SRC = { tableId: 'tblA', label: 'A' };

test('parsers tolerate missing and odd values', () => {
  assert.equal(text(undefined), '');
  assert.equal(text([{ type: 'text', text: 'Hi ' }, { type: 'text', text: 'there' }]), 'Hi there');
  assert.equal(text({ type: 1, value: [{ type: 'text', text: 'formula' }] }), 'formula');
  assert.deepEqual(users('nope'), []);
  assert.deepEqual(users([{ id: 'ou_1', name: '名', en_name: 'Amy' }, { name: 'no id' }]), [{ openId: 'ou_1', name: 'Amy', avatarUrl: null }]);
  assert.deepEqual(links({ link_record_ids: ['r1', 'r2'] }), ['r1', 'r2']);
  assert.deepEqual(links([{ record_ids: ['r3'], text: 'x' }]), ['r3']);
  assert.equal(datetime('abc'), null);
  assert.equal(datetime(1675526400000), 1675526400000);
  assert.deepEqual(multi(null), []);
});

test('status mapping uses the exact Lark option names', () => {
  assert.deepEqual(stageOf('Not yet started'), { stage: 'todo', omStage: false });
  assert.deepEqual(stageOf('O&M Stage'), { stage: 'ongoing', omStage: true });
  assert.deepEqual(stageOf('Stalled'), { stage: 'stalled', omStage: false });
  assert.deepEqual(stageOf('Completed'), { stage: 'done', omStage: false });
  assert.deepEqual(stageOf(null), { stage: 'notset', omStage: false });
  assert.deepEqual(stageOf('On hold'), { stage: 'notset', omStage: false });
});

test('an empty record maps without throwing and shows Not set values', () => {
  const t = mapTask({ record_id: 'rec1', fields: {} }, SRC);
  assert.equal(t.id, 'tblA:rec1');
  assert.equal(t.sourceTableId, 'tblA');
  assert.equal(t.title, 'Untitled task');
  assert.equal(t.stage, 'notset');
  assert.equal(t.due, null);
  assert.deepEqual(t.assignees, []);
  assert.equal(t.priority, null);
});

test('Department and Departments merge without duplicates', () => {
  const t = mapTask({ record_id: 'r', fields: { Department: ['O&M', 'Marketing'], Departments: ['O&M', 'C&I'] } }, SRC);
  assert.deepEqual(t.rawDepartments, ['O&M', 'Marketing', 'C&I']);
  assert.deepEqual(t.departments, ['O&M', 'Marketing', 'C&I']);
});

test('department names map to the 9 app departments', () => {
  assert.equal(mapDepartment('Operations & Maintenance'), 'O&M');
  assert.equal(mapDepartment('Commercial & Industrial'), 'C&I');
  assert.equal(mapDepartment('Human Resources'), 'HR');
  assert.equal(mapDepartment('Warehouse'), 'Procurement/Warehouse & Logistics');
  assert.equal(mapDepartment('Three Sixty'), null);
  assert.equal(mapDepartment(''), null);
});

test('free, working and overloaded follow the threshold', () => {
  assert.equal(statusKey(0, 3, 5), 'free');
  assert.equal(statusKey(3, 3, 5), 'free');
  assert.equal(statusKey(4, 3, 5), 'working');
  assert.equal(statusKey(5, 3, 5), 'overloaded');
});

test('model: overdue, open counts, support excluded from workload', () => {
  const now = Date.UTC(2026, 9, 5, 4); // 5 Oct 2026 12:00 in KL
  const day = (d: number) => Date.UTC(2026, 9, d) - 8 * 3600_000; // midnight KL
  const amy = { openId: 'ou_a', name: 'Amy', avatarUrl: null };
  const ben = { openId: 'ou_b', name: 'Ben', avatarUrl: null };
  const base = mapTask({ record_id: 'x', fields: {} }, SRC);
  const snap: Snapshot = {
    generatedAt: now,
    tasks: [
      { ...base, id: '1', assignees: [amy], support: [ben], due: day(4), stage: 'ongoing' },
      { ...base, id: '2', assignees: [amy], due: day(4), stage: 'done' },
      { ...base, id: '3', assignees: [amy], due: day(5), stage: 'notset' },
      { ...base, id: '4', assignees: [], due: null, stage: 'todo' },
    ],
    projects: [],
    people: [
      { ...amy, jobTitle: '', dept: 'O&M', larkDepartments: [], source: 'contacts' },
      { ...ben, jobTitle: '', dept: null, larkDepartments: [], source: 'tasks' },
    ],
    departmentMap: [],
    skippedTables: [],
    sources: [],
    warnings: [],
    freeThreshold: 3,
    overloadedAt: 5,
    writesEnabled: false,
    duplicatesSkipped: 0,
    hiddenTasks: 0,
  };
  const m = build(snap, undefined, now);
  const t = (id: string) => m.tasks.find((x) => x.id === id)!;
  assert.equal(klDay(now), klDay(day(5)));
  assert.equal(t('1').overdue, true);
  assert.equal(t('1').dueLabel, '1 day late');
  assert.equal(t('2').overdue, false);
  assert.equal(t('3').dueLabel, 'Today');
  assert.equal(t('4').dueLabel, 'Not set');
  assert.equal(t('4').assigneeNames, 'Not set');
  assert.equal(m.personById.get('ou_a')!.n, 2);
  assert.equal(m.personById.get('ou_b')!.n, 0);
  assert.equal(m.personById.get('ou_b')!.deptLabel, 'Not set');
  assert.ok(m.depts.includes('Not set'));
});

test('rows repeated in a later table count once; edited copies count again', async () => {
  const { dropCrossTableDuplicates } = await import('../lib/data/dedupe.ts');
  const u = { openId: 'ou_a', name: 'A', avatarUrl: null };
  const base = mapTask({ record_id: 'x', fields: {} }, SRC);
  const ph = [{ ...base, id: 'ph1', title: 'QA Test', statusRaw: 'Ongoing', due: 1, assignees: [u] }, { ...base, id: 'ph2', title: 'Other', statusRaw: null, due: null, assignees: [] }];
  const om = [{ ...base, id: 'om1', title: 'QA test ', statusRaw: 'Ongoing', due: 1, assignees: [u] }, { ...base, id: 'om2', title: 'Other', statusRaw: 'Stalled', due: null, assignees: [] }];
  const r = dropCrossTableDuplicates([ph, om]);
  assert.deepEqual(r.tasks.map((t) => t.id), ['ph1', 'ph2', 'om2']);
  assert.equal(r.skipped, 1);
});

test('ignored Lark department names map to nothing', () => {
  for (const n of ['MAQO Solar', 'Design', 'Product', 'R&D']) assert.equal(mapDepartment(n), null);
});

test('hidden people and their tasks are removed; they are dropped from Support elsewhere', async () => {
  const { hideConfigured } = await import('../lib/data/hide.ts');
  const x = { openId: 'ou_x', name: 'X', avatarUrl: null };
  const a = { openId: 'ou_a', name: 'A', avatarUrl: null };
  const base = mapTask({ record_id: 'r', fields: {} }, SRC);
  const r = hideConfigured(
    [
      { ...base, id: '1', accountable: [x] },
      { ...base, id: '2', assignees: [x] },
      { ...base, id: '3', assignees: [a], support: [x, a] },
      { ...base, id: '4', assignees: [a] },
    ],
    ['ou_x'],
  );
  assert.deepEqual(r.tasks.map((t) => t.id), ['3', '4']);
  assert.deepEqual(r.tasks[0].support.map((u) => u.openId), ['ou_a']);
  assert.equal(r.hiddenTasks, 2);
});
