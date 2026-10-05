// The 9 app departments. Lark org-chart departments are mapped onto these.
// Phase 3 fills LARK_DEPARTMENT_OVERRIDES once the real org-chart names are known.

export const DEPARTMENTS = [
  'CEO Office',
  'Residential',
  'C&I',
  'Marketing',
  'O&M',
  'Engineering',
  'Finance',
  'HR',
  'Procurement/Warehouse & Logistics',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/** Lark department name or ID -> app department, for names that don't match exactly. */
export const LARK_DEPARTMENT_OVERRIDES: Record<string, Department> = {};
