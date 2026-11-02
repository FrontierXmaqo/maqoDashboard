// Procurement mapping: Lark record shapes -> the page's view model.
// Shapes follow the Lark "Record data structure" doc: text is [{type,text}], select is a string
// (or string[] for multi), dates are ms timestamps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientResolver, itemFrom, mapDispatch, mapOrder } from '../lib/data/procurement.ts';
import { afterCutover, emptyData, procurementSince, sinceLabel, snapshotData } from '../lib/procurement.ts';
import type { LarkRecord } from '../lib/lark/records.ts';

const t = (s: string) => [{ type: 'text', text: s }];
/** 2026-10-29 00:00 Kuala Lumpur (UTC+8). */
const ms = (iso: string) => Date.parse(iso);

const PROJECTS: LarkRecord[] = [
  { record_id: 'p1', fields: { 'Client Name': t('SHAHIZAN BIN BAHAROM'), 'Project Code': t('R26070092') } },
  { record_id: 'p2', fields: { 'Client Name': t('Wan Azida Binti Ab Aziz'), 'Project Code': t('R26080100') } },
  { record_id: 'p3', fields: { 'Client Name': t('Tengku Ahmad Bin Tengku Kasim'), 'Project Code': t('R26100116') } },
  { record_id: 'p4', fields: { 'Client Name': t('ZULHILMI BIN MOHMAD'), 'Project Code': t('R26080099') } },
];

const resolve = clientResolver(PROJECTS);

test('client resolver: prefix match on the client name', () => {
  assert.equal(resolve('SHAHIZAN BIN BAHAR'), 'SHAHIZAN BIN BAHAROM');
  assert.equal(resolve('WAN AZIDA'), 'Wan Azida Binti Ab Aziz');
});

test('client resolver: does not invent a match from a shared surname', () => {
  // "HJ ROSLI BIN AHMAD" must not land on "Tengku Ahmad Bin Tengku Kasim".
  assert.equal(resolve('HJ ROSLI BIN AHMAD'), null);
  assert.equal(resolve('AUTO ANTENNA MANUFACTURER SDN BHD'), null);
});

test('client resolver: bulk buckets are never a single client', () => {
  assert.equal(resolve('RESI BULK'), null);
  assert.equal(resolve('NA'), null);
  assert.equal(resolve(''), null);
});

test('item: pulls the description out of "Remarks : <kind> ; <item>"', () => {
  assert.equal(itemFrom('Remarks : Item received ; Seaward PV1525'), 'Seaward PV1525');
  assert.equal(itemFrom('Remarks: Custom Duties ; Egret Mounting for Resi Bulk (Urgent)'), 'Egret Mounting for Resi Bulk (Urgent)');
  assert.equal(itemFrom('PO2508-027'), 'PO2508-027');
  assert.equal(itemFrom(''), '—');
});

test('mapOrder: reads text, select and date fields', () => {
  const rec: LarkRecord = {
    record_id: 'reczz28T7GCZUdde',
    fields: {
      'Serial no.': t('PRQ-2026100127'),
      'Project No.': t('HJ ROSLI BIN AHMAD'),
      'Pay to': t('LOYAL GRAND ELECTRICAL TRADING'),
      'Purpose for payment': t('Remarks : Item received ; Seaward PV1525'),
      'Amount': 14300,
      'Amount-Currency': 'MYR',
      'Status': 'Under Review',
      'Submitted at': ms('2026-10-29T00:00:00+08:00'),
      'Est. Payment date': ms('2026-11-15T00:00:00+08:00'),
    },
  };
  const o = mapOrder(rec, resolve);
  assert.equal(o.id, 'PRQ-2026100127');
  assert.equal(o.rid, 'reczz28T7GCZUdde');
  assert.equal(o.project, 'HJ ROSLI BIN AHMAD');
  assert.equal(o.client, null);
  assert.equal(o.item, 'Seaward PV1525');
  assert.equal(o.supplier, 'LOYAL GRAND ELECTRICAL TRADING');
  assert.equal(o.requested, '29 Oct 2026');
  assert.equal(o.expected, '15 Nov 2026');
  assert.equal(o.ordered, null, 'the Base has no Ordered field');
  assert.equal(o.status, 'Under Review');
  assert.equal(o.amount, '14,300.00 MYR');
});

test('mapOrder: tolerates select arrays, missing fields and blank rows', () => {
  const o = mapOrder({ record_id: 'recX', fields: { 'Amount-Currency': ['USD'], 'Amount': 8200 } }, resolve);
  assert.equal(o.amount, '8,200.00 USD');
  assert.equal(o.id, 'recX', 'falls back to the record id when Serial no. is empty');
  assert.equal(o.project, '—');
  assert.equal(o.status, 'Unknown');

  const blank = mapOrder({ record_id: 'recY', fields: {} }, resolve);
  assert.equal(blank.expected, '—');
  assert.equal(blank.amount, '—');
});

test('mapDispatch: client falls back to the free-text column', () => {
  const d = mapDispatch({
    record_id: 'recDO',
    fields: {
      'DO Number': t('12345'),
      'Client': 'Other / not listed',
      'Client Name (if not listed)': t('frontier x'),
      'Status': 'Submitted',
      'Submitted At': ms('2026-10-30T11:41:11+08:00'),
    },
  });
  assert.equal(d.doNumber, '12345');
  assert.equal(d.client, 'Other / not listed');
  assert.equal(d.status, 'Submitted');
  assert.equal(d.date, '30 Oct 2026');
});

// ---------------------------------------------------------------------------
// Cutover: only requests submitted from the switch-on date onward are shown.
// ---------------------------------------------------------------------------

const CUTOVER = Date.parse('2026-11-02T00:00:00+08:00');

test('cutover: default is midnight Kuala Lumpur on 2 Nov 2026', () => {
  delete process.env.PROCUREMENT_SINCE;
  assert.equal(procurementSince(), CUTOVER);
  assert.equal(sinceLabel(CUTOVER), '2 Nov 2026');
});

test('cutover: env override wins, invalid input falls back to the default', () => {
  process.env.PROCUREMENT_SINCE = '2027-01-15';
  assert.equal(procurementSince(), Date.parse('2027-01-15T00:00:00+08:00'));
  assert.equal(sinceLabel(procurementSince()), '15 Jan 2027');

  process.env.PROCUREMENT_SINCE = 'not-a-date';
  assert.equal(procurementSince(), CUTOVER, 'a typo must not blank the dashboard');

  process.env.PROCUREMENT_SINCE = '';
  assert.equal(procurementSince(), CUTOVER);
  delete process.env.PROCUREMENT_SINCE;
});

test('cutover: boundary is inclusive and undated rows count as history', () => {
  assert.equal(afterCutover(CUTOVER, CUTOVER), true, 'exactly midnight on the cutover is kept');
  assert.equal(afterCutover(CUTOVER - 1, CUTOVER), false, 'one millisecond earlier is dropped');
  assert.equal(afterCutover(Date.parse('2026-10-29T00:00:00+08:00'), CUTOVER), false);
  assert.equal(afterCutover(Date.parse('2026-11-02T09:15:00+08:00'), CUTOVER), true);
  assert.equal(afterCutover(null, CUTOVER), false, 'no date cannot be proven new');
  assert.equal(afterCutover(undefined, CUTOVER), false);
  assert.equal(afterCutover(0, CUTOVER), false, 'a 0 timestamp is not "now"');
  assert.equal(afterCutover(Number.NaN, CUTOVER), false);
});

test('cutover: a mixed submission list keeps only the post-cutover rows', () => {
  const rows = [
    { id: 'oct', at: Date.parse('2026-10-29T00:00:00+08:00') },
    { id: 'edge', at: CUTOVER },
    { id: 'nov', at: Date.parse('2026-11-02T09:15:00+08:00') },
    { id: 'undated', at: null },
  ];
  assert.deepEqual(
    rows.filter((r) => afterCutover(r.at, CUTOVER)).map((r) => r.id),
    ['edge', 'nov'],
  );
});

test('cutover: a cutover later than the snapshot shows nothing rather than stale history', () => {
  // The snapshot's newest row is 29 Oct 2026, so a 2 Nov cutover leaves it with nothing to say.
  const d = snapshotData(CUTOVER);
  assert.equal(d.orders.length, 0);
  assert.deepEqual(d.board, { requested: [], ordered: [], delivered: [] });
  assert.equal(d.totals.requests, 0);
  assert.equal(d.since, '2 Nov 2026');
  assert.deepEqual(d.warnings, [], 'an empty window is normal, not an error');
});

test('cutover: a cutover before the snapshot still serves it', () => {
  const d = snapshotData(Date.parse('2026-10-01T00:00:00+08:00'));
  assert.equal(d.orders.length, 12);
  assert.equal(d.totals.requests, 850);
  assert.equal(d.since, '1 Oct 2026');
});

test('emptyData: a zeroed page that still carries the cutover label', () => {
  const d = emptyData('2 Nov 2026');
  assert.equal(d.orders.length, 0);
  assert.equal(d.live, false);
  assert.equal(d.since, '2 Nov 2026');
  assert.deepEqual(d.totals, { requests: 0, approved: 0, pastExpected: 0, underReview: 0, deliveredThisMonth: 0 });
});
