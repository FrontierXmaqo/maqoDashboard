// Procurement page data.
//
// SNAPSHOT, not live. The app has no Purchase Orders table wired yet (the previous page was an
// empty layout waiting for one). These are the most recent payment requests read from the
// "Procurement Payment Request / DO logs" Base on 2 Nov 2026, frozen here so the page can be
// reviewed. Replace ORDERS with a server-side Base read once that Base has its own token.

export const PROCUREMENT_WIKI_NODE = 'VjL9wI4sSiMOAJkp8xHlbu7vg4f';
export const PROCUREMENT_TABLE = 'tbl3WZecsojfYRnW';

/** Deep link to one payment request in Lark Base. */
export const recordUrl = (recordId: string) =>
  `https://bsgyt70achks.sg.larksuite.com/wiki/${PROCUREMENT_WIKI_NODE}?table=${PROCUREMENT_TABLE}&record=${recordId}`;

export type OrderStatus = 'Approved' | 'Under Review' | 'Recalled' | 'Rejected';

/** Approval status -> the app's tone scale (g/b/a/r/n). */
export const ORDER_TONE: Record<OrderStatus, 'g' | 'b' | 'a' | 'r' | 'n'> = {
  Approved: 'g',
  'Under Review': 'a',
  Recalled: 'n',
  Rejected: 'r',
};

export type ProcurementOrder = {
  id: string;
  rid: string;
  project: string;
  /** From "Active Projects 2026". Null when the free-text Project No. does not match a client. */
  client: string | null;
  item: string;
  supplier: string;
  requested: string;
  /** No Ordered field exists in the Base yet. */
  ordered: string | null;
  expected: string;
  status: OrderStatus;
  amount: string;
};

/** Latest 12 requests, newest first. */
export const ORDERS: ProcurementOrder[] = [
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

/** Headline counts across all 850 requests in the Base. */
export const TOTALS = {
  requests: 850,
  approved: 731,
  pastExpected: 843,
  underReview: 10,
  deliveredThisMonth: 0,
};

/** The one dispatch recorded so far, from "Dispatch Log v2". */
export const LAST_DISPATCH = {
  doNumber: 'DO 12345',
  client: 'frontier x',
  date: '30 Oct 2026',
  evidence: 'Signed DO + goods photo',
};
