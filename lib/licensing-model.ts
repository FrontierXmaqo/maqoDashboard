// Licensing (ATAP) applications for Residential and C&I. Client-safe, no Lark access.

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

/** ATAP Application Status options, in the order the process runs. Unknown options are listed after these. */
export const ATAP_STAGES = ['Pending Declaration Form', 'Pending Signed Declaration', 'Pending ATAP Application', 'Submitted ATAP Application', 'Pending eATAP Payment', 'eATAP Payment Done', 'Pending SEDA Approval', 'ATAP Approved'];
export const ATAP_DONE = 'ATAP Approved';

export type Licence = {
  id: string;
  category: LicensingCategory;
  client: string;
  projectId: string;
  documentsStatus: string;
  atapStatus: string;
  /** RM, null when not paid or not set. */
  payment: number | null;
  sales: PersonRef[];
  chatGroup: string;
  declarationLink: string;
  signedForm: number;
  cert: number;
};

export type LicensingStage = { stage: string; n: number };

export function licensingSummary(list: Licence[]) {
  const done = list.filter((l) => l.atapStatus === ATAP_DONE).length;
  const counts = new Map<string, number>();
  for (const l of list) counts.set(l.atapStatus || 'Not set', (counts.get(l.atapStatus || 'Not set') ?? 0) + 1);
  const known = ATAP_STAGES.filter((s) => counts.has(s));
  const other = [...counts.keys()].filter((s) => !ATAP_STAGES.includes(s)).sort();
  return {
    total: list.length,
    done,
    inProgress: list.length - done,
    pendingDocs: list.filter((l) => l.documentsStatus.toLowerCase().startsWith('pending')).length,
    paidRm: list.reduce((s, l) => s + (l.payment ?? 0), 0),
    stages: [...known, ...other].map((stage): LicensingStage => ({ stage, n: counts.get(stage) ?? 0 })),
  };
}
