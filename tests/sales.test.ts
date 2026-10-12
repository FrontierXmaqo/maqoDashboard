import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapResi, mapTarget } from '../lib/data/sales.ts';
import { resiByPerson, salesSummary } from '../lib/sales-model.ts';

const amy = [{ id: 'ou_a', name: 'Amy' }];
const ben = [{ id: 'ou_b', name: 'Ben' }];

test('resi rows from both yearly tables, cancelled kept out of kWp', () => {
  const now = mapResi({ record_id: 'r1', created_time: 1, fields: { 'PROJECT CODE': 'MR26-1', 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 6, 'PROJECT STATUS': 'PENDING' } }, 2026);
  const old = mapResi({ record_id: 'r2', fields: { 'Project Code': 'MR24-1', 'Sales Pic': amy, 'System Size (kWp)': 5, Status: 'Completed', 'Executed Date Installation': Date.UTC(2024, 5, 1) } }, null);
  const cancel = mapResi({ record_id: 'r3', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 9, 'PROJECT STATUS': 'CANCEL BY CLIENT' } }, 2026);
  assert.equal(now.year, 2026);
  assert.equal(old.year, 2024);
  assert.equal(old.status, 'COMPLETED');
  const done = mapResi({ record_id: 'r4', fields: { Progress: { type: 2, value: [1] }, 'Stage No.': { type: 2, value: [11] } } }, 2026);
  assert.equal(done.status, 'COMPLETED');
  assert.equal(done.stage, 'Stage 11');
  assert.equal(mapResi({ record_id: 'r5', fields: { Progress: { type: 2, value: [0.5] } } }, 2026).status, 'IN PROGRESS');
  assert.deepEqual(resiByPerson([now, cancel]), [{ p: { openId: 'ou_a', name: 'Amy', avatarUrl: null }, projects: 2, kwp: 6, rm: 0, pricedKwp: 0, ongoing: 1, completed: 0, cancelled: 1 }]);
});

test('C&I Target rows read the lookup and formula shapes Lark returns', () => {
  const t = mapTarget({ record_id: 't1', fields: { SC: amy, 'Sales Target (RM)': 16000000, 'Sales Achivement': { type: 2, value: [3979390.18] }, 'Closes Sales (kWp)': { type: 2, value: [2709.2] }, 'Sales Pipeline (Hot Lead)': { type: 2, value: [1589189.1] } } });
  assert.equal(t.target, 16000000);
  assert.equal(t.achievement, 3979390.18);
  assert.equal(t.closedKwp, 2709.2);
  assert.equal(t.hotRm, 1589189.1);
  assert.equal(t.pipelineKwp, 0); // missing lookup reads as 0
});

test('overview summary uses the latest year, skips cancelled projects and C&I rows with no SC', () => {
  const r = (year: number, kwp: number, status: string | null) => mapResi({ record_id: String(Math.random()), fields: { 'SYSTEM SIZE(KWP)': kwp, 'PROJECT STATUS': status } }, year);
  const t = (sc: unknown[], target: number, ach: number) => mapTarget({ record_id: String(Math.random()), fields: { SC: sc, 'Sales Target (RM)': target, 'Sales Achivement': { type: 2, value: [ach] }, 'Sales Pipeline (Hot Lead)': { type: 2, value: [40] } } });
  const s = salesSummary([r(2026, 5, 'COMPLETED'), r(2026, 9, 'CANCEL BY CLIENT'), r(2025, 7, null)], [t(amy, 1000, 100), t([], 5000, 999)], []);
  assert.deepEqual(s.resi, { year: 2026, kwp: 5, projects: 1, ongoing: 0, completed: 1, rm: null, target: { rm: null, kwp: null } });
  assert.deepEqual(s.ci, { closedRm: 100, closedKwp: 0, target: 1000, hotRm: 40, pipelineRm: 0 });
  assert.deepEqual(s.alerts.map((x) => x.href), ['/ci']);
  assert.equal(s.people.length, 1);
  assert.equal(s.people[0].dept, 'C&I');
});

test('residential selling price is summed per person when the column exists', () => {
  const a = mapResi({ record_id: 'x1', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 10, 'SELLING PRICE (RM)': 40000 } }, 2026);
  const b = mapResi({ record_id: 'x2', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 5 } }, 2026);
  const [row] = resiByPerson([a, b]);
  assert.equal(row.rm, 40000);
  assert.equal(row.pricedKwp, 10); // RM/kWp only uses priced projects
  assert.equal(row.kwp, 15);
});
