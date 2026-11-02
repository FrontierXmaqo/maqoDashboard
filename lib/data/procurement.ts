// Procurement loader: reads the "Procurement Payment Request / DO logs" Base.
// Server-only, read-only. Never throws: a Base that cannot be read becomes a warning and the
// saved snapshot, so the page always renders something truthful and labelled.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { cached } from './cache.ts';
import { datetime, display, num, single } from './parse.ts';
import { fixturesEnabled } from './fixtures.ts';
import { afterCutover, procurementSince, sinceLabel, snapshotData, type DispatchRow, type ProcurementData, type ProcurementOrder } from '../procurement.ts';

/** Base tokens are not secrets — they appear in every shared URL. Env var wins if set. */
const PROC_BASE = process.env.LARK_PROC_BASE_TOKEN?.trim() || 'IyZFbpJMVaxPeZs6tFElgaTsgxf';

const REQUESTS = 'tbl3WZecsojfYRnW'; // MAQO Payment Request
const ACTIVE_PROJECTS = 'tblFVx8ckPTQN1Ea'; // Active Projects 2026
const DISPATCH_V2 = 'tbl56pdrKHeZlM85'; // Dispatch Log v2 (proposed)
const OUTBOUND_DO = 'tblNNc3YSkpVYYJI'; // Outbound DO Log

const TABLE_ROWS = 12;
const BOARD_CARDS = 3;

const describe = (e: unknown) => (e instanceof Error ? e.message : String(e));

const dateFmt = new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
const monthFmt = new Intl.DateTimeFormat('en-MY', { month: 'numeric', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });

const fmtDate = (ms: number | null) => (ms == null ? '—' : dateFmt.format(new Date(ms)));
const fmtMoney = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Values the team uses for "not a single client" — never resolved to a client name. */
const NON_CLIENT_PROJECTS = new Set(['', 'na', 'n/a', 'resi bulk', 'residential', 'bulk order for c i and resi']);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Resolve a client from "Active Projects 2026" by comparing the free-text Project No. with the
 * client name. Deliberately conservative: only a full match or a prefix match of 9+ characters,
 * so "HJ ROSLI BIN AHMAD" never lands on an unrelated "…BIN AHMAD".
 */
export function clientResolver(projects: LarkRecord[]): (project: string) => string | null {
  const rows = projects
    .map((p) => display(p.fields?.['Client Name']))
    .filter(Boolean)
    .map((name) => ({ name, key: norm(name) }))
    .filter((r) => r.key.length >= 4);

  return (project: string) => {
    const p = norm(project);
    if (!p || NON_CLIENT_PROJECTS.has(p)) return null;
    for (const r of rows) {
      if (r.key === p || r.key.startsWith(`${p} `)) return r.name;
      if (p.length >= 10 && r.key.startsWith(p)) return r.name;
    }
    return null;
  };
}

/**
 * The Base has no item field: the description is free text in "Purpose for payment", usually
 * shaped "Remarks : Item received ; Seaward PV1525". Take the part after the first semicolon.
 */
export function itemFrom(purpose: string): string {
  const clean = purpose.replace(/\s+/g, ' ').trim().replace(/^remarks?\s*:?\s*/i, '');
  const parts = clean.split(';');
  const tail = parts.length > 1 ? parts.slice(1).join(';').trim() : clean;
  return (tail || clean || '—').slice(0, 120);
}

export function mapOrder(rec: LarkRecord, clientOf: (project: string) => string | null): ProcurementOrder {
  const f = rec.fields ?? {};
  const currency = single(f['Amount-Currency']) ?? '';
  const project = display(f['Project No.']) || '—';
  return {
    id: display(f['Serial no.']) || rec.record_id,
    rid: rec.record_id,
    project,
    client: clientOf(project),
    item: itemFrom(display(f['Purpose for payment'])),
    supplier: display(f['Pay to']) || '—',
    requested: fmtDate(datetime(f['Submitted at'])),
    ordered: null,
    expected: fmtDate(datetime(f['Est. Payment date'])),
    status: single(f['Status']) ?? 'Unknown',
    amount: `${fmtMoney(num(f['Amount']))}${currency ? ` ${currency}` : ''}`,
  };
}

export function mapDispatch(rec: LarkRecord): DispatchRow {
  const f = rec.fields ?? {};
  return {
    doNumber: display(f['DO Number']) || '—',
    client: single(f['Client']) || display(f['Client Name (if not listed)']) || '—',
    date: fmtDate(datetime(f['Dispatch Date']) ?? datetime(f['Submitted At'])),
    status: single(f['Status']) ?? '—',
  };
}

const submittedAt = (rec: LarkRecord) => datetime(rec.fields?.['Submitted at']) ?? 0;

export async function loadProcurement(): Promise<ProcurementData> {
  const sinceMs = procurementSince();
  const since = sinceLabel(sinceMs);

  if (fixturesEnabled()) {
    return { ...snapshotData(sinceMs), warnings: ['Local fixtures mode: showing the saved snapshot, not the live Base.'] };
  }

  let requests: LarkRecord[];
  let projects: LarkRecord[];
  let dispatch: LarkRecord[];

  try {
    requests = await cached('proc:requests', READ_CACHE_SECONDS, () => searchAllRecords(PROC_BASE, REQUESTS));
    projects = await cached('proc:projects', READ_CACHE_SECONDS, () => searchAllRecords(PROC_BASE, ACTIVE_PROJECTS));
  } catch (e) {
    const fallback = snapshotData(sinceMs);
    // The snapshot is all pre-cutover history, so with a 2 Nov cutover it has nothing to show.
    // Say that plainly instead of claiming to display rows that are not there.
    const warning = fallback.orders.length
      ? `Could not read the Procurement Base (${describe(e)}). Showing the saved 2 Nov 2026 snapshot.`
      : `Could not read the Procurement Base (${describe(e)}). The saved snapshot holds nothing on or after ${since}, so the page is empty.`;
    return { ...fallback, warnings: [warning] };
  }

  // Dispatch logs are optional: one table is empty, the other holds the real rows.
  try {
    dispatch = await cached('proc:dispatch', READ_CACHE_SECONDS, () => searchAllRecords(PROC_BASE, DISPATCH_V2));
    if (!dispatch.length) {
      dispatch = await cached('proc:dispatch-do', READ_CACHE_SECONDS, () => searchAllRecords(PROC_BASE, OUTBOUND_DO));
    }
  } catch {
    dispatch = [];
  }

  // Cutover: everything submitted before `since` is history and stays out of the page.
  const sinceRequests = requests.filter((r) => afterCutover(submittedAt(r), sinceMs));
  const sinceDispatch = dispatch.filter((r) =>
    afterCutover(datetime(r.fields?.['Dispatch Date']) ?? datetime(r.fields?.['Submitted At']), sinceMs),
  );

  const clientOf = clientResolver(projects);

  // Newest first, by the raw Submitted at timestamp (not the formatted label).
  const all = sinceRequests
    .map((rec) => ({ rec, at: submittedAt(rec) }))
    .sort((a, b) => b.at - a.at)
    .map(({ rec }) => mapOrder(rec, clientOf));

  const now = Date.now();
  const thisMonth = monthFmt.format(new Date(now));
  const dispatches = sinceDispatch.map(mapDispatch);

  const approved = all.filter((o) => o.status === 'Approved');
  const underReview = all.filter((o) => o.status === 'Under Review');

  return {
    orders: all.slice(0, TABLE_ROWS),
    board: {
      requested: underReview.slice(0, BOARD_CARDS),
      ordered: approved.slice(0, BOARD_CARDS),
      delivered: dispatches.slice(0, BOARD_CARDS),
    },
    totals: {
      requests: sinceRequests.length,
      approved: approved.length,
      pastExpected: sinceRequests.filter((r) => {
        const d = datetime(r.fields?.['Est. Payment date']);
        return d != null && d < now;
      }).length,
      underReview: underReview.length,
      deliveredThisMonth: sinceDispatch.filter((r) => {
        const d = datetime(r.fields?.['Dispatch Date']) ?? datetime(r.fields?.['Submitted At']);
        return d != null && monthFmt.format(new Date(d)) === thisMonth;
      }).length,
    },
    warnings: [],
    live: true,
    since,
  };
}
