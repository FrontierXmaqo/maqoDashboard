// Procurement types, Lark deep links, and the saved snapshot used as a fallback.
//
// The live read lives in lib/data/procurement.ts. This file is safe to import from client
// components: it holds no credentials and no server-only code.

export const PROC_WIKI_NODE = 'VjL9wI4sSiMOAJkp8xHlbu7vg4f';
export const PROC_TABLE = 'tbl3WZecsojfYRnW';

/** Deep link to one payment request in Lark Base. */
export const recordUrl = (recordId: string) =>
  `https://bsgyt70achks.sg.larksuite.com/wiki/${PROC_WIKI_NODE}?table=${PROC_TABLE}&record=${recordId}`;

export type ProcurementOrder = {
  id: string;
  rid: string;
  project: string;
  /** From "Active Projects 2026". Null when the free-text project does not match a client. */
  client: string | null;
  item: string;
  supplier: string;
  requested: string;
  /** No Ordered field exists in the Base yet. */
  ordered: string | null;
  expected: string;
  status: string;
  amount: string;
};

export type DispatchRow = {
  doNumber: string;
  client: string;
  date: string;
  status: string;
};

export type ProcurementTotals = {
  requests: number;
  approved: number;
  pastExpected: number;
  underReview: number;
  deliveredThisMonth: number;
};

export type ProcurementData = {
  orders: ProcurementOrder[];
  board: { requested: ProcurementOrder[]; ordered: ProcurementOrder[]; delivered: DispatchRow[] };
  totals: ProcurementTotals;
  warnings: string[];
  /** False when the numbers come from the saved snapshot rather than the live Base. */
  live: boolean;
  /** Cutover label, e.g. "2 Nov 2026". Nothing submitted before this is counted. */
  since: string;
};

/**
 * Cutover date for the dashboard. Requests submitted before this are ignored, so the page only
 * tracks activity from the switch-on point instead of 850 rows of history.
 * Override with PROCUREMENT_SINCE=YYYY-MM-DD. Fixed, not "start of today": otherwise a record
 * submitted today would disappear tomorrow.
 */
export const PROCUREMENT_SINCE_DEFAULT = '2026-11-02';

/** Midnight Kuala Lumpur on the cutover date, in ms. Invalid input falls back to the default. */
export function procurementSince(): number {
  const raw = process.env.PROCUREMENT_SINCE?.trim() || PROCUREMENT_SINCE_DEFAULT;
  const ms = Date.parse(`${raw}T00:00:00+08:00`);
  return Number.isFinite(ms) ? ms : Date.parse(`${PROCUREMENT_SINCE_DEFAULT}T00:00:00+08:00`);
}

/** "2026-11-02" -> "2 Nov 2026", for the page's caption. */
export function sinceLabel(ms: number): string {
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(ms));
}

/**
 * True when a record falls inside the post-cutover window. A record with no date counts as
 * history: it cannot be shown to be new, and including it would leak old rows back onto the page.
 * The boundary is inclusive, so a request submitted at 00:00 on the cutover date is kept.
 */
export function afterCutover(ms: number | null | undefined, sinceMs: number): boolean {
  return ms != null && Number.isFinite(ms) && ms >= sinceMs;
}

/** Approval status -> the app's tone scale (g/b/a/r/n). */
export function orderTone(status: string): 'g' | 'b' | 'a' | 'r' | 'n' {
  switch (status) {
    case 'Approved':
      return 'g';
    case 'Under Review':
      return 'a';
    case 'Rejected':
      return 'r';
    case 'Recalled':
    case 'Canceled':
    case 'Terminated':
      return 'n';
    default:
      return 'b';
  }
}

// ---------------------------------------------------------------------------
// Snapshot: the latest 12 requests as read on 2 Nov 2026. Only used when the
// live Base read fails, so the page never renders blank.
// ---------------------------------------------------------------------------

const SNAPSHOT_ORDERS: ProcurementOrder[] = [
  { id: 'PRQ-2026100127', rid: 'reczz28T7GCZUdde', project: 'HJ ROSLI BIN AHMAD', client: null, item: 'For upcoming Hj Rosli project (urgent)', supplier: 'LOYAL GRAND ELECTRICAL TRADING', requested: '29 Oct 2026', ordered: null, expected: '15 Nov 2026', status: 'Under Review', amount: '21.20 MYR' },
  { id: 'PRQ-2026100126', rid: 'reczz28T7GCZSE6d', project: 'SHAHIZAN BIN BAHAR', client: 'SHAHIZAN BIN BAHAROM', item: 'For upcoming Shahizan Bin Bahar project', supplier: 'LOYAL GRAND ELECTRICAL TRADING', requested: '29 Oct 2026', ordered: null, expected: '15 Nov 2026', status: 'Under Review', amount: '170.00 MYR' },
  { id: 'PRQ-2026100125', rid: 'reczz28T7GCZRImk', project: 'RESI BULK', client: null, item: 'For upcoming resi project (urgent)', supplier: 'LOYAL GRAND ELECTRICAL TRADING', requested: '29 Oct 2026', ordered: null, expected: '15 Nov 2026', status: 'Under Review', amount: '6,160.00 MYR' },
  { id: 'PRQ-2026100112', rid: 'reczz28SmotRVam0', project: 'RESI BULK', client: null, item: 'Custom duties — Egret mounting for Resi Bulk', supplier: 'WORLD ASIA FREIGHT NETWORK SDN BHD', requested: '28 Oct 2026', ordered: null, expected: '29 Oct 2026', status: 'Approved', amount: '2,742.54 MYR' },
  { id: 'PRQ-2026100100', rid: 'reczz28SmotRSBr8', project: 'PONG CODAN BESS', client: null, item: 'Freight & handling — 3 unit Livoltek battery', supplier: 'WORLD ASIA FREIGHT NETWORK SDN BHD', requested: '28 Oct 2026', ordered: null, expected: '28 Aug 2026', status: 'Under Review', amount: '8,656.29 MYR' },
  { id: 'PRQ-2026100098', rid: 'reczz28SmotRTKfn', project: 'PONG CODAN BESS', client: null, item: 'Freight & handling — 3 unit Livoltek battery', supplier: 'WORLD ASIA FREIGHT NETWORK SDN BHD', requested: '28 Oct 2026', ordered: null, expected: '28 Aug 2026', status: 'Recalled', amount: '8,656.29 MYR' },
  { id: 'PRQ-2026100082', rid: 'reczz28SmotRS6SW', project: 'AUTO ANTENNA MANUFACTURER', client: null, item: 'DC cable for Auto Antenna project', supplier: 'AMTECH POWER SDN BHD', requested: '22 Oct 2026', ordered: null, expected: '25 Oct 2026', status: 'Under Review', amount: '22,329.00 MYR' },
  { id: 'PRQ-2026100081', rid: 'reczz28SmotRSw8g', project: 'O&M ECOSENSA JELI KELANTAN', client: null, item: 'DC cable and AC cable', supplier: 'AMTECH POWER SDN BHD', requested: '22 Oct 2026', ordered: null, expected: '15 Dec 2026', status: 'Under Review', amount: '2,785.00 MYR' },
  { id: 'PRQ-2026100080', rid: 'reczz28SmotRUT6h', project: 'RESI BULK', client: null, item: 'DC cable for Resi upcoming project', supplier: 'AMTECH POWER SDN BHD', requested: '22 Oct 2026', ordered: null, expected: '25 Nov 2026', status: 'Under Review', amount: '7,800.00 MYR' },
  { id: 'PRQ-2026100078', rid: 'reczz28SmotRSA8G', project: 'AUTO ANTENNA & RESI BULK', client: null, item: '90% balance payment — Aiko 650w', supplier: 'AIKO ENERGY SINGAPORE PTE LTD', requested: '22 Oct 2026', ordered: null, expected: '25 Oct 2026', status: 'Under Review', amount: '52,606.80 USD' },
  { id: 'PRQ-2026100077', rid: 'reczz28SmotRV4ea', project: 'WAN AZIDA', client: 'Wan Azida Binti Ab Aziz', item: '30% deposit — Fox inverter', supplier: 'GREEN FOX SDN BHD', requested: '22 Oct 2026', ordered: null, expected: '23 Oct 2026', status: 'Approved', amount: '1,834.20 MYR' },
  { id: 'PRQ-2026100076', rid: 'reczz28SmotRTlHy', project: 'RESI BULK', client: null, item: '10% deposit — 1 container Trina 650w panel', supplier: 'TRINA SOLAR ENERGY DVELOPMENT PTE LTD', requested: '22 Oct 2026', ordered: null, expected: '23 Oct 2026', status: 'Approved', amount: '5,335.20 USD' },
];

const SNAPSHOT_DISPATCH: DispatchRow[] = [{ doNumber: 'DO 12345', client: 'frontier x', date: '30 Oct 2026', status: 'Submitted' }];

/** Newest row in the snapshot; anything cut over after this cannot be shown from it. */
const SNAPSHOT_LATEST_MS = Date.parse('2026-10-29T00:00:00+08:00');

/** A page with no rows yet — used when the cutover is later than the snapshot can cover. */
export function emptyData(since: string): ProcurementData {
  return {
    orders: [],
    board: { requested: [], ordered: [], delivered: [] },
    totals: { requests: 0, approved: 0, pastExpected: 0, underReview: 0, deliveredThisMonth: 0 },
    warnings: [],
    live: false,
    since,
  };
}

export function snapshotData(sinceMs: number): ProcurementData {
  const since = sinceLabel(sinceMs);
  // The snapshot is all pre-cutover history, so a later cutover leaves nothing to show.
  if (sinceMs > SNAPSHOT_LATEST_MS) return emptyData(since);

  return {
    orders: SNAPSHOT_ORDERS,
    board: {
      requested: SNAPSHOT_ORDERS.filter((o) => o.status === 'Under Review').slice(0, 3),
      ordered: SNAPSHOT_ORDERS.filter((o) => o.status === 'Approved').slice(0, 3),
      delivered: SNAPSHOT_DISPATCH,
    },
    totals: { requests: 850, approved: 731, pastExpected: 843, underReview: 10, deliveredThisMonth: 0 },
    warnings: [],
    live: false,
    since,
  };
}
