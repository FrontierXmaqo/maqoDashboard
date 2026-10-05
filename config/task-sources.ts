// Lark Base tables that hold tasks. Every table here must use the same field names
// (see config/schema.ts). To add a department's task table, add one entry.

export type TaskSource = {
  tableId: string;
  label: string;
  /** New tasks in these departments are created in this table. */
  createFor?: string[];
  /** New tasks in any other department go to the default table. */
  createDefault?: boolean;
};

export const TASK_SOURCES: TaskSource[] = [
  { tableId: 'tbllh9KcfhidHupv', label: '(PH) Task Breakdown', createDefault: true },
  { tableId: 'tblG3imQ2abeqfC0', label: '(O&M) Task Breakdown Copy', createFor: ['O&M'] },
];

/** The table a new task in this department is created in. */
export function tableForNewTask(dept: string): TaskSource {
  return TASK_SOURCES.find((s) => s.createFor?.includes(dept)) ?? TASK_SOURCES.find((s) => s.createDefault) ?? TASK_SOURCES[0];
}

/** Read-only projects table. Tasks link to it through `PROJECT NAME (handover)`. */
export const PROJECTS_SOURCE: TaskSource = {
  tableId: 'tbl5QmCHTiIgjUlE',
  label: 'O&M CNI HANDOVER,CONTACT INFO',
};
