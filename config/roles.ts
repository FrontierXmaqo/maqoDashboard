// Who has which role. Everyone not listed here is an employee.
// Use Lark open_ids (they start with "ou_"). Each person can see their own on the Settings
// page after signing in; the CEO sees everyone's in the employee drawer. Shown read-only
// on the Settings page.

import type { Department } from './departments.ts';

export const CEO_OPEN_IDS: string[] = [
  // 'ou_xxxxxxxx', // KK (Kong Kok King)
];

export const LEADERS: { openId: string; departments: Department[] }[] = [
  // { openId: 'ou_xxxxxxxx', departments: ['C&I', 'Engineering'] }, // a division head leading two departments
];
