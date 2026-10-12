import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapCi, mapResi } from '../lib/data/sales.ts';
import { ciByPerson, ciStatus, resiByPerson } from '../lib/sales-model.ts';

const amy = [{ id: 'ou_a', name: 'Amy' }];
const ben = [{ id: 'ou_b', name: 'Ben' }];

test('resi rows from both yearly tables, cancelled kept out of kWp', () => {
  const now = mapResi({ record_id: 'r1', created_time: 1, fields: { 'PROJECT CODE': 'MR26-1', 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 6, 'PROJECT STATUS': 'PENDING' } }, 2026);
  const old = mapResi({ record_id: 'r2', fields: { 'Project Code': 'MR24-1', 'Sales Pic': amy, 'System Size (kWp)': 5, Status: 'Completed', 'Executed Date Installation': Date.UTC(2024, 5, 1) } }, null);
  const cancel = mapResi({ record_id: 'r3', fields: { 'SALES PIC': amy, 'SYSTEM SIZE(KWP)': 9, 'PROJECT STATUS': 'CANCEL BY CLIENT' } }, 2026);
  assert.equal(now.year, 2026);
  assert.equal(old.year, 2024);
  assert.equal(old.status, 'COMPLETED');
  assert.deepEqual(resiByPerson([now, cancel]), [{ p: { openId: 'ou_a', name: 'Amy', avatarUrl: null }, projects: 2, kwp: 6, ongoing: 1, completed: 0, cancelled: 1 }]);
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
