// Lark Base tables that hold tasks. Every table here must use the same field names
// (see config/schema.ts). To add a department's task table, add one entry.

export type TaskSource = {
  tableId: string;
  label: string;
};

export const TASK_SOURCES: TaskSource[] = [
  { tableId: 'tbllh9KcfhidHupv', label: '(PH) Task Breakdown' },
  { tableId: 'tblG3imQ2abeqfC0', label: '(O&M) Task Breakdown Copy' },
];

/** Read-only projects table. Tasks link to it through `PROJECT NAME (handover)`. */
export const PROJECTS_SOURCE: TaskSource = {
  tableId: 'tbl5QmCHTiIgjUlE',
  label: 'O&M CNI HANDOVER,CONTACT INFO',
};
