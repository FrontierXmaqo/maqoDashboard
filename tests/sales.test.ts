import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapCi, mapResi } from '../lib/data/sales.ts';
import { ciByPerson, ciStatus, resiByPerson, salesSummary } from '../lib/sales-model.ts';

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

test('C&I statuses tolerate the messy option names', () => {
  assert.equal(ciStatus('Closed Sales '), 'closed');
  assert.equal(ciStatus('Warm Lead (Under Business Development) '), 'warm');
  assert.equal(ciStatus('Cold Lead (On Hold / Lost Case)'), 'cold');
  assert.equal(ciStatus(null), 'other');
});

test('C&I totals fall back to kWp × RM/kWp and targets add up per person', () => {
  const a = mapCi({ record_id: 'c1', fields: { 'Sales PIC': amy, 'Client Status': 'Closed Sales', 'System Size (kWp)': 100, 'RM/kWP': 2000, Year: '2026' } });
  const b = mapCi({ record_id: 'c2', fields: { 'Sales PIC': ben, 'Client Status': 'Hot Lead ', 'Total (RM)': 50000, Year: '2026' } });
  assert.equal(a.total, 200000);
  assert.equal(a.year, 2026);
  const rows = ciByPerson([a, b], [{ sales: [{ openId: 'ou_a', name: 'Amy', avatarUrl: null }], target: 500000 }]);
  assert.equal(rows[0].p.name, 'Amy');
  assert.equal(rows[0].closedRm, 200000);
  assert.equal(rows[0].target, 500000);
  assert.equal(rows[1].hotRm, 50000);
});

test('overview summary uses the latest year and skips cancelled projects', () => {
  const r = (year: number, kwp: number, status: string | null) => mapResi({ record_id: String(Math.random()), fields: { 'SYSTEM SIZE(KWP)': kwp, 'PROJECT STATUS': status } }, year);
  const withPic = mapResi({ record_id: 'p', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 4 } }, 2026);
  assert.deepEqual(salesSummary([withPic], [], [], []).people, [{ p: { openId: 'ou_a', name: 'Amy', avatarUrl: null }, dept: 'Residential', projects: 1, kwp: 4, closedRm: 0, hotRm: 0 }]);
  const c = (status: string, total: number, year: string) => mapCi({ record_id: String(Math.random()), fields: { 'Client Status': status, 'Total (RM)': total, Year: year } });
  const s = salesSummary([r(2026, 5, 'COMPLETED'), r(2026, 9, 'CANCEL BY CLIENT'), r(2025, 7, null)], [c('Closed Sales', 100, '2026'), c('Hot Lead', 40, '2026'), c('Closed Sales', 999, '2025')], [{ sales: [{ openId: 'ou_a', name: 'Amy', avatarUrl: null }], target: 1000 }, { sales: [], target: 5 }], []);
  assert.deepEqual(s.resi, { year: 2026, kwp: 5, projects: 1, ongoing: 0, completed: 1, rm: null, target: { rm: null, kwp: null } });
  assert.deepEqual(s.ci, { year: 2026, closedRm: 100, closedKwp: 0, closedN: 1, target: 1000, hotRm: 40, hotN: 1 });
  assert.deepEqual(s.people, []); // no Sales PIC on these rows, so no one to list
  assert.deepEqual(s.alerts.map((x) => x.text), ['C&I closed RM 0k of RM 0.0M target (10%)']);
});

test('residential selling price is summed per person when the column exists', () => {
  const a = mapResi({ record_id: 'x1', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 10, 'SELLING PRICE (RM)': 40000 } }, 2026);
  const b = mapResi({ record_id: 'x2', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 5 } }, 2026);
  const [row] = resiByPerson([a, b]);
  assert.equal(row.rm, 40000);
  assert.equal(row.pricedKwp, 10); // RM/kWp only uses priced projects
  assert.equal(row.kwp, 15);
});
