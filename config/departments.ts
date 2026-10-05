// The 9 app departments. Lark org-chart departments and the Department / Departments
// options on tasks are mapped onto these.

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

/**
 * Exact Lark names (org-chart department name, or a task's Department option) -> app
 * department. Checked before the keyword rules below. Add entries here when a name maps
 * wrongly; the Settings page lists every Lark name and where it landed.
 */
export const LARK_DEPARTMENT_OVERRIDES: Record<string, Department> = {};

/** Lark names that are not one of the 9 departments and are deliberately ignored. */
export const LARK_DEPARTMENT_IGNORED = ['MAQO Solar', 'Design', 'Product', 'R&D'];

/** Keyword rules, tried in order on the lower-cased name. */
const RULES: [RegExp, Department][] = [
  [/\bceo\b|chief executive|management office|director/, 'CEO Office'],
  [/residential|\bresi\b/, 'Residential'],
  [/\bc\s*&\s*i\b|\bcni\b|commercial|industrial/, 'C&I'],
  [/marketing|\bmkt\b/, 'Marketing'],
  [/\bo\s*&\s*m\b|\boam\b|operation|maintenance/, 'O&M'],
  [/engineer/, 'Engineering'],
  [/financ|account/, 'Finance'],
  [/\bhr\b|human resource|people/, 'HR'],
  [/procure|warehouse|logistic|purchas/, 'Procurement/Warehouse & Logistics'],
];

export function mapDepartment(name: string | null | undefined): Department | null {
  const n = (name ?? '').trim();
  if (!n) return null;
  if (n in LARK_DEPARTMENT_OVERRIDES) return LARK_DEPARTMENT_OVERRIDES[n];
  if (LARK_DEPARTMENT_IGNORED.some((x) => x.toLowerCase() === n.toLowerCase())) return null;
  const exact = DEPARTMENTS.find((d) => d.toLowerCase() === n.toLowerCase());
  if (exact) return exact;
  const lower = n.toLowerCase();
  for (const [re, dept] of RULES) if (re.test(lower)) return dept;
  return null;
}
