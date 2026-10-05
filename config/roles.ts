// Who has which role. Everyone not listed here is an employee.
// Filled in Phase 3 with real Lark open_ids. Shown read-only on the Settings page.

import type { Department } from './departments.ts';

export const CEO_OPEN_IDS: string[] = [];

export const LEADERS: { openId: string; departments: Department[] }[] = [];
