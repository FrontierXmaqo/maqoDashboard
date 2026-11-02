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

/** One row of the Overview card's short list: the longest overdue, or the newest still waiting. */
export type ProcurementUrgent = {
  rid: string;
  id: string;
  supplier: string;
  amount: string;
  status: string;
  /** Whole days past the expected delivery date. Null when the row is not late. */
  lateBy: number | null;
};

/** The shape the Overview page needs. Deliberately mirrors the four Procurement-page KPIs. */
export type ProcurementSummary = {
  /** Approved — same as the "Orders on the way" KPI. */
  onTheWay: number;
  /** Expected delivery date already passed — same as the "Past expected delivery" KPI. */
  pastExpected: number;
  /** Under Review — same as the "Waiting to be ordered" KPI. */
  waiting: number;
  deliveredThisMonth: number;
  /** Status split for the bar. The four numbers sum to the request count. */
  split: { approved: number; underReview: number; rejected: number; recalled: number };
  /** At most three rows, most overdue first. */
  urgent: ProcurementUrgent[];
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
  /** 1-based page of the purchase-order table, already clamped to a real page. */
  page: number;
  /** Number of pages available. Never below 1, so "page 1 of 1" is the empty case. */
  pageCount: number;
  /** Condensed figures for the Overview card. */
  summary: ProcurementSummary;
};

/** Rows per page in the purchase-order table. */
export const PAGE_SIZE = 20;

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

// ---------------------------------------------------------------------------
// Paging the purchase-order table. The page lives in the URL (?page=2) so it
// survives a refresh, works with the back button, and can be shared.
// ---------------------------------------------------------------------------

/** Total pages for `total` rows. Always at least 1, so an empty table is "page 1 of 1". */
export function pageCountFor(total: number, size = PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

/**
 * Turn a raw `?page=` value into a real page. Anything unparseable, zero, negative,
 * fractional or past the end lands on a page that exists — a bad URL must not 404 or
 * render an empty table.
 */
export function pageFrom(raw: string | string[] | undefined, pageCount: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value.trim() === '') return 1;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, pageCount));
}

/** The rows belonging to one 1-based page. Out-of-range pages come back empty, not wrapped. */
export function pageSlice<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  const start = (Math.max(1, page) - 1) * size;
  return items.slice(start, start + size);
}

/**
 * Page numbers to render: first, last, and the current page with one neighbour either side,
 * with '…' standing in for the gaps. Keeps the control a fixed width on long lists.
 */
export function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 1) return [1];
  const keep = new Set([1, pageCount, page - 1, page, page + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Overview summary. Pure so the counting rules can be tested without Lark.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** A request reduced to what the summary needs. */
export type SummaryRow = {
  order: ProcurementOrder;
  /** "Est. Payment date" in ms, or null when the field is empty. */
  expectedMs: number | null;
};

export function emptySummary(): ProcurementSummary {
  return {
    onTheWay: 0,
    pastExpected: 0,
    waiting: 0,
    deliveredThisMonth: 0,
    split: { approved: 0, underReview: 0, rejected: 0, recalled: 0 },
    urgent: [],
  };
}

/**
 * Build the Overview figures. `rows` must be newest-submitted first, because that order decides
 * which requests appear in the list when nothing is late yet.
 */
export function buildSummary(rows: SummaryRow[], deliveredThisMonth: number, now: number): ProcurementSummary {
  const split = { approved: 0, underReview: 0, rejected: 0, recalled: 0 };
  const late: { row: SummaryRow; days: number }[] = [];

  for (const r of rows) {
    switch (r.order.status) {
      case 'Approved':
        split.approved += 1;
        break;
      case 'Under Review':
        split.underReview += 1;
        break;
      case 'Rejected':
        split.rejected += 1;
        break;
      case 'Recalled':
      case 'Canceled':
      case 'Terminated':
        split.recalled += 1;
        break;
      default:
        // An unrecognised status still counts toward the request total on the Procurement page,
        // so it must not vanish from the bar either. Fold it in with the dead ones.
        split.recalled += 1;
    }
    if (r.expectedMs != null && r.expectedMs < now) {
      late.push({ row: r, days: Math.floor((now - r.expectedMs) / DAY_MS) });
    }
  }

  late.sort((a, b) => b.days - a.days);
  const urgent = late.slice(0, 3).map(({ row, days }) => toUrgent(row, days));

  // Nothing overdue yet: show the newest requests that still need ordering, so the card is
  // never a set of numbers with nothing to act on.
  if (!urgent.length) {
    for (const r of rows) {
      if (urgent.length === 3) break;
      if (r.order.status === 'Under Review') urgent.push(toUrgent(r, null));
    }
  }

  return {
    onTheWay: split.approved,
    pastExpected: late.length,
    waiting: split.underReview,
    deliveredThisMonth,
    split,
    urgent,
  };
}

function toUrgent(row: SummaryRow, lateBy: number | null): ProcurementUrgent {
  return {
    rid: row.order.rid,
    id: row.order.id,
    supplier: row.order.supplier,
    amount: row.order.amount,
    status: row.order.status,
    lateBy,
  };
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
    page: 1,
    pageCount: 1,
    summary: emptySummary(),
  };
}

export function snapshotData(sinceMs: number): ProcurementData {
  const since = sinceLabel(sinceMs);
  // The snapshot is all pre-cutover history, so a later cutover leaves nothing to show.
  if (sinceMs > SNAPSHOT_LATEST_MS) return emptyData(since);

  return {
    // One page, deliberately. The snapshot keeps the Base's real historical totals below so the
    // KPIs stay representative, but it only holds the latest 12 rows — offering a page 2 that
    // could never have rows would be a lie. The caption says "latest 12 of N" to explain the gap.
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
    page: 1,
    pageCount: 1,
    // Matches the historical totals above rather than the 12 rows held here, and carries no
    // urgent list: the snapshot has no reliable lateness data to rank.
    summary: {
      onTheWay: 731,
      pastExpected: 843,
      waiting: 10,
      deliveredThisMonth: 0,
      split: { approved: 731, underReview: 10, rejected: 15, recalled: 94 },
      urgent: [],
    },
  };
}
