// Licensing applications for Residential (ATAP) and C&I (CAS, SEDA, ST, TNB, MGTC). Client-safe, no Lark access.

import type { PersonRef } from './types.ts';

export const LICENSING_BASES = {
  Resi: { base: 'EKRNbzjUhaqyKbsfLYAlAv5Fggc', table: 'tblycdyWVAvgped0', view: 'vew44Jfv2y' },
  'C&I': { base: 'VidWbpYqcalYncsmVIAlPRLYgtg', table: 'tblmsO5jjPa7PIYj', view: 'vewXzzweBf' },
} as const;
export type LicensingCategory = keyof typeof LICENSING_BASES;

export const licensingUrl = (c: LicensingCategory) => {
  const { base, table, view } = LICENSING_BASES[c];
  return `https://bsgyt70achks.sg.larksuite.com/base/${base}?table=${table}&view=${view}`;
};

/** One record's card in Lark. */
export const licenceRecordUrl = (c: LicensingCategory, recordId: string) => `${licensingUrl(c)}&record=${recordId}`;

/** Resi ATAP Application Status options, in the order the process runs. Unknown options are listed after these. */
export const ATAP_STAGES = ['Submitted ATAP Application', 'Pending Signed Declaration Form', 'Pending ATAP Application', 'Pending eATAP Payment', 'eATAP Payment Done', 'Pending SEDA Approval', 'ATAP Approved'];
export const ATAP_DONE = 'ATAP Approved';

/** C&I authorities with a status field. */
export const AUTHORITIES = ['CAS', 'SEDA', 'ST', 'TNB', 'MGTC'] as const;
export type Authority = (typeof AUTHORITIES)[number];

/** Systems up to this size follow the Resi route (no CAS, ST or MGTC). */
export const SMALL_KWP = 7.2;
export const isSmall = (l: { kwp: number | null }) => l.kwp != null && l.kwp <= SMALL_KWP;
export const isSelco = (client: string) => /selco/i.test(client);

/** Authorities a C&I case needs, in the order they run. SELCO cases skip SEDA. */
export function authorityRoute(small: boolean, selco: boolean): Authority[] {
  if (small) return selco ? ['TNB'] : ['SEDA', 'TNB'];
  return selco ? ['CAS', 'TNB', 'ST', 'MGTC'] : ['CAS', 'SEDA', 'ST', 'TNB', 'MGTC'];
}

/** A C&I case with no update on any authority for this long counts as stuck. */
export const STALE_DAYS = 21;
const DAY = 86_400_000;

export const isApproved = (s: string) => /approved|done|completed/i.test(s) && !/not|reject/i.test(s);

/** A blank authority status in the C&I table means the step has not started. */
export const NOT_STARTED = 'Not started';

/** Where a C&I status sits in the process (SEDA, ST, TNB options), for ordering. */
export function statusRank(s: string): number {
  if (!s || s === NOT_STARTED) return 0;
  if (/^submit/i.test(s)) return 1;
  if (/waiting for v/i.test(s)) return 2;
  if (/reject/i.test(s)) return 4;
  if (isApproved(s)) return 5;
  return 3;
}

export type Licence = {
  id: string;
  category: LicensingCategory;
  client: string;
  sales: PersonRef[];
  remarks: string;
  done: boolean;
  /** Latest "date of update" across authorities (C&I only), ms. */
  lastUpdate: number | null;
  // Resi
  projectId: string;
  /** ATAP Submission Date, ms. */
  submittedAt: number | null;
  licensingPic: PersonRef[];
  documentsStatus: string;
  atapStatus: string;
  payment: number | null;
  declarationLink: string;
  signedForm: number;
  cert: number;
  // C&I. Authorities that don't apply (MGTC not needed) are left out.
  type: string;
  kwp: number | null;
  authorities: { name: Authority; status: string; at: number | null }[];
  chatLink: string;
};

// Statuses that come before the application is submitted; the others are at or past submission.
const PRE_SUBMIT = ['Pending Signed Declaration Form', 'Pending ATAP Application'];

/** Resi rows whose Lark data contradicts its own status, so the team can fix them in Lark. */
export function licenceIssues(l: Licence): string[] {
  if (l.category !== 'Resi') return [];
  const known = ATAP_STAGES.includes(l.atapStatus);
  const pre = PRE_SUBMIT.includes(l.atapStatus);
  const out: string[] = [];
  if (known && !pre && l.submittedAt == null) out.push('Status is past submission but ATAP Submission Date is empty');
  if (pre && l.submittedAt != null) out.push('Has an ATAP Submission Date but status is before submission');
  if (l.done && l.documentsStatus.toLowerCase().startsWith('pending')) out.push('ATAP approved but Documents Status is still pending');
  return out;
}

export const daysSince = (ms: number | null, now: number) => (ms == null ? null : Math.floor((now - ms) / DAY));
export const isStale = (l: Licence, now: number) => l.category === 'C&I' && !l.done && (daysSince(l.lastUpdate, now) ?? Infinity) >= STALE_DAYS;

export function licensingSummary(list: Licence[], now: number) {
  const resi = list.filter((l) => l.category === 'Resi');
  const ci = list.filter((l) => l.category === 'C&I');
  const counts = new Map<string, number>();
  for (const l of resi) counts.set(l.atapStatus || 'Not set', (counts.get(l.atapStatus || 'Not set') ?? 0) + 1);
  const other = [...counts.keys()].filter((s) => !ATAP_STAGES.includes(s)).sort();
  const done = list.filter((l) => l.done).length;
  return {
    total: list.length,
    done,
    inProgress: list.length - done,
    pendingDocs: resi.filter((l) => l.documentsStatus.toLowerCase().startsWith('pending')).length,
    stale: ci.filter((l) => isStale(l, now)).length,
    paidRm: resi.reduce((s, l) => s + (l.payment ?? 0), 0),
    kwp: ci.reduce((s, l) => s + (l.kwp ?? 0), 0),
    stages: [...ATAP_STAGES.filter((s) => counts.has(s)), ...other].map((stage) => ({ stage, n: counts.get(stage) ?? 0 })),
    /** Per authority, how many C&I cases sit at each status, in process order. */
    authorities: AUTHORITIES.map((name) => {
      const m = new Map<string, number>();
      for (const l of ci) {
        const a = l.authorities.find((x) => x.name === name);
        if (a) m.set(a.status || NOT_STARTED, (m.get(a.status || NOT_STARTED) ?? 0) + 1);
      }
      return { name, statuses: [...m.entries()].sort((a, b) => statusRank(a[0]) - statusRank(b[0]) || a[0].localeCompare(b[0])).map(([status, n]) => ({ status, n })) };
    }),
  };
}

/** C&I progress buckets for the overview chart, in process order. Waiting and in progress share one step. */
export const CI_BUCKETS = ['Not started', 'Submitted', 'In progress / waiting', 'Approved', 'Rejected'] as const;
const bucketOf = (status: string) => [0, 1, 2, 2, 4, 3][statusRank(status)];

export type LicensingOverview = {
  resi: { stage: string; n: number }[];
  ci: { name: Authority; total: number; buckets: number[] }[];
  stale: number;
  issues: number;
};

export function licensingOverview(list: Licence[], now: number): LicensingOverview {
  const resi = list.filter((l) => l.category === 'Resi');
  const ci = list.filter((l) => l.category === 'C&I');
  return {
    resi: ATAP_STAGES.map((stage) => ({ stage, n: resi.filter((l) => l.atapStatus === stage).length })),
    ci: AUTHORITIES.map((name) => {
      const buckets = CI_BUCKETS.map(() => 0);
      let total = 0;
      for (const l of ci) {
        const a = l.authorities.find((x) => x.name === name);
        if (!a) continue;
        total++;
        buckets[bucketOf(a.status)]++;
      }
      return { name, total, buckets };
    }),
    stale: ci.filter((l) => isStale(l, now)).length,
    issues: resi.filter((l) => licenceIssues(l).length).length,
  };
}
