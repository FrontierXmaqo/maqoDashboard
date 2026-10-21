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
  assert.deepEqual(cal.events, [{ kind: 'SITE VISIT 1', at: 1000 }, { kind: 'INSTALLATION DAY 2', at: 2000 }]);
  assert.equal(cal.team[0].openId, 'ou_a');
  assert.deepEqual(resiEvents([cal]).map((e) => e.kind), ['SITE VISIT 1', 'INSTALLATION DAY 2']);
  const ci = mapCiEvents({ record_id: 'c1', fields: { 'Client Name': 'Acme', 'Client Status': 'Hot Lead ', 'Site Visit Date': 3000, 'Sales PIC': amy } });
  assert.deepEqual(ci.map((e) => [e.kind, e.at, e.detail]), [['C&I SITE VISIT', 3000, 'Hot Lead']]);
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

test('licensing: resi ATAP rows and C&I per-authority rows, summary and stale flag', async () => {
  const { mapResiLicence, mapCiLicence } = await import('../lib/data/licensing.ts');
  const { licensingSummary, isStale } = await import('../lib/licensing-model.ts');
  const day = 86_400_000;
  const now = 100 * day;
  const r = mapResiLicence({ record_id: 'l1', fields: { 'Client Name': [{ type: 'text', text: 'Tan' }], 'Documents Status': 'Pending Documents', 'ATAP Application Status': 'ATAP Approved', 'eATAP Payment': 112.5, 'Sales PIC': { type: 11, value: amy }, 'Submit Declaration Link': { type: 1, value: [{ type: 'text', text: 'https://x.test' }] }, 'Signed Declaration Form': { type: 17, value: [{ name: 's.pdf' }] }, 'ATAP Cert': [{ name: 'c.pdf' }], 'ATAP Submission Date': 5 } });
  // Lookups (Sales PIC, Signed Declaration Form) and the link formula are unwrapped.
  assert.deepEqual([r.client, r.declarationLink, r.cert, r.signedForm, r.sales[0].openId, r.submittedAt, r.done], ['Tan', 'https://x.test', 1, 1, 'ou_a', 5, true]);
  const { licenceIssues } = await import('../lib/licensing-model.ts');
  assert.deepEqual(licenceIssues(r), ['ATAP approved but Documents Status is still pending']);
  const early = mapResiLicence({ record_id: 'l3', fields: { 'Client Name': 'Lee', 'ATAP Application Status': 'Pending ATAP Application', 'ATAP Submission Date': 5 } });
  const late = mapResiLicence({ record_id: 'l4', fields: { 'Client Name': 'Ng', 'ATAP Application Status': 'Pending SEDA Approval' } });
  assert.equal(licenceIssues(early).length, 1);
  assert.equal(licenceIssues(late)[0], 'Status is past submission but ATAP Submission Date is empty');
  // MGTC not needed, all three approved -> done. Truncated field names are found by prefix.
  const a = mapCiLicence({ record_id: 'c1', fields: { 'CLIENT NAME 1': 'UV Sdn Bhd', 'MGTC NEEDED ??': 'NO', 'SEDA STATUS': 'APPROVED', 'ST STATUS': 'APPROVED', 'TNB STATUS': 'APPROVED', 'ST DATE OF UPDATE': 90 * day, KWP: [{ type: 'text', text: '997.050' }], 'Link Whatssapp Group': { link: 'https://chat.whatsapp.com/x', text: 'x' } } });
  assert.equal(a.chatLink, 'https://chat.whatsapp.com/x');
  // MGTC needed and in progress, last update 30 days ago -> stale.
  const b = mapCiLicence({ record_id: 'c2', fields: { 'CLIENT NAME 1': 'Acme', 'MGTC NEEDED ??': 'YES', 'SEDA STATUS': 'APPROVED', 'MGTC STATUS': 'IN PROGRESS', 'DATE OF MGTC UPDATE': 70 * day, 'CAS DATE OF UPDATE': 60 * day } });
  assert.deepEqual(a.authorities.map((x) => x.name), ['SEDA', 'ST', 'TNB']);
  assert.equal(a.done, true);
  assert.equal(b.done, false);
  assert.equal(b.lastUpdate, 70 * day);
  assert.deepEqual([isStale(a, now), isStale(b, now)], [false, true]);
  const s = licensingSummary([r, a, b], now);
  assert.deepEqual([s.total, s.done, s.inProgress, s.pendingDocs, s.stale, s.kwp], [3, 2, 1, 1, 1, 997.05]);
  assert.equal(mapCiLicence({ record_id: 'c3', fields: { 'CLIENT NAME 1': 'X' } }).authorities.length, 4); // blank MGTC NEEDED counts as needed
  const { statusRank } = await import('../lib/licensing-model.ts');
  assert.deepEqual(['APPROVED', 'REJECTED', 'WAITING FOR VERIFICATION', 'SUBMITTED', ''].sort((x, y) => statusRank(x) - statusRank(y)), ['', 'SUBMITTED', 'WAITING FOR VERIFICATION', 'REJECTED', 'APPROVED']);
  const { licensingOverview } = await import('../lib/licensing-model.ts');
  const ov = licensingOverview([r, a, b], now);
  assert.equal(ov.resi.find((x) => x.stage === 'ATAP Approved')?.n, 1);
  // buckets: not started, submitted, in progress / waiting, approved, rejected
  assert.deepEqual(ov.ci.find((x) => x.name === 'MGTC'), { name: 'MGTC', total: 1, buckets: [0, 0, 1, 0, 0] });
  assert.deepEqual(ov.ci.find((x) => x.name === 'ST')?.buckets, [1, 0, 0, 1, 0]);
  assert.deepEqual([ov.stale, ov.issues], [1, 1]);
  assert.deepEqual(s.authorities.find((x) => x.name === 'MGTC')?.statuses, [{ status: 'IN PROGRESS', n: 1 }]);
  assert.deepEqual(s.authorities.find((x) => x.name === 'ST')?.statuses, [{ status: 'Not started', n: 1 }, { status: 'APPROVED', n: 1 }]);
});
