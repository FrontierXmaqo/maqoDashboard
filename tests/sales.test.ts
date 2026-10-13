import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closedCounts, mapCiEvents, mapResi, mapResiSale, mapTarget } from '../lib/data/sales.ts';
import { financialYear, resiByPerson, resiEvents, resiSalesStats, salesSummary } from '../lib/sales-model.ts';

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
  assert.equal(done.stage, 'Done');
  const cal = mapResi({ record_id: 'r7', fields: { 'SITE VISIT DATE': 1000, 'EXECUTED DATE INSTALLATION (DAY 2)': 2000, 'PIC SITE VISIT': amy } }, 2026);
  assert.deepEqual(cal.events, [{ kind: 'Site visit', at: 1000 }, { kind: 'Installation', at: 2000 }]);
  assert.equal(cal.team[0].openId, 'ou_a');
  assert.deepEqual(resiEvents([cal]).map((e) => e.short), ['SV', 'Install']);
  const ci = mapCiEvents({ record_id: 'c1', fields: { 'Client Name': 'Acme', 'Client Status': 'Hot Lead ', 'Site Visit Date': 3000, 'Sales PIC': amy } });
  assert.deepEqual(ci.map((e) => [e.kind, e.at, e.detail]), [['Site visit', 3000, 'Hot Lead']]);
  assert.deepEqual(mapCiEvents({ record_id: 'c2', fields: { 'Client Status': 'Lost Deal', 'Site Visit Date': 3000 } }), []);
  assert.equal(mapResi({ record_id: 'r6', fields: { 'Stage No.': { type: 2, value: [8] } } }, 2026).stage, 'Installation Date');
  assert.equal(mapResi({ record_id: 'r5', fields: { Progress: { type: 2, value: [0.5] } } }, 2026).status, 'IN PROGRESS');
  assert.deepEqual(resiByPerson([now, cancel]), [{ p: { openId: 'ou_a', name: 'Amy', avatarUrl: null }, projects: 2, kwp: 6, ongoing: 1, completed: 0, cancelled: 1 }]);
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
  const s = salesSummary([r(2026, 5, 'COMPLETED'), r(2026, 9, 'CANCEL BY CLIENT'), r(2025, 7, null)], [], [t(amy, 1000, 100), t([], 5000, 999)], [], Date.UTC(2026, 9, 12));
  assert.equal(s.resi?.kwp, 5);
  assert.equal(s.resi?.projects, 1);
  assert.deepEqual(s.ci, { closedRm: 100, closedKwp: 0, closedN: 0, target: 1000, hotRm: 40, pipelineRm: 0 });
  assert.deepEqual(s.alerts.map((x) => x.href), ['/residential', '/ci']); // no resi sales yet, behind pace
  assert.equal(s.people.length, 1);
  assert.equal(s.people[0].dept, 'C&I');
});

test('residential sales: financial year from September, this month, and RM 1M a month target', () => {
  const now = Date.UTC(2026, 9, 12); // 12 Oct 2026
  assert.equal(financialYear(now).label, 'FYE 2026/27');
  assert.equal(financialYear(Date.UTC(2026, 7, 31)).label, 'FYE 2025/26');
  const sale = (y: number, m: number, price: number, kw: number) => mapResiSale({ record_id: String(Math.random()), fields: { 'Sales PIC': amy, 'Selling Price': price, 'System Size (kWp)': { type: 2, value: [kw] }, 'Deposit Payment Date': Date.UTC(y, m, 10) } });
  const st = resiSalesStats([sale(2026, 8, 265476, 10), sale(2026, 9, 88800, 4), sale(2026, 5, 50000, 2)], now);
  assert.equal(st.monthRm, 88800);
  assert.equal(st.fyRm, 354276); // Sep + Oct, June is last financial year
  assert.equal(st.fyCases, 2);
  assert.equal(st.fyTarget, 12_000_000);
  assert.equal(st.byMonth.at(-1)?.rm, 88800);
  assert.equal(st.byPerson[0].kwp, 14);
});

test('closed deals are counted per Sales PIC, whatever the status spacing', () => {
  const c = (status: string, pic = amy) => ({ record_id: String(Math.random()), fields: { 'Client Status': status, 'Sales PIC': pic } });
  const m = closedCounts([c('Closed Sales'), c('Closed Sales '), c('Hot Lead'), c('Closed Sales', ben)]);
  assert.equal(m.get('ou_a'), 2);
  assert.equal(m.get('ou_b'), 1);
});
