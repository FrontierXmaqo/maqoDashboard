// The field mapping the app expects in Lark Base. `npm run check-schema` compares
// the live Base against this file. Field type codes come from the Lark docs for
// "List fields" (bitable/v1/apps/:app_token/tables/:table_id/fields).

export const FIELD_TYPE = {
  Text: 1,
  Number: 2,
  SingleSelect: 3,
  MultiSelect: 4,
  DateTime: 5,
  Checkbox: 7,
  User: 11,
  Phone: 13,
  Url: 15,
  Attachment: 17,
  Link: 18,
  Formula: 20,
  DuplexLink: 21,
  Location: 22,
  GroupChat: 23,
  CreatedTime: 1001,
  ModifiedTime: 1002,
  CreatedUser: 1003,
  ModifiedUser: 1004,
  AutoSerial: 1005,
} as const;

export function fieldTypeName(code: number): string {
  for (const [name, value] of Object.entries(FIELD_TYPE)) if (value === code) return name;
  return `type ${code}`;
}

export type ExpectedField = {
  /** Exact Lark field name. */
  name: string;
  /** Accepted Lark type codes. Empty = any type is accepted (shown for information). */
  types: number[];
  /** For select fields: option names the app reads or writes. */
  options?: string[];
  /** For link fields: the table the link must point to. */
  linkTable?: string;
  /** Missing is reported as a warning, not a failure. */
  optional?: boolean;
  note?: string;
};

export const TASK_STATUS_OPTIONS = ['Not yet started', 'Ongoing', 'O&M Stage', 'Stalled', 'Completed'];
export const PRIORITY_OPTIONS = ['Important', 'Normal'];

export const TASK_FIELDS: ExpectedField[] = [
  { name: 'Task', types: [FIELD_TYPE.Text] },
  { name: 'Task Responsible', types: [FIELD_TYPE.User] },
  { name: 'Task Accountable', types: [FIELD_TYPE.User] },
  { name: 'Task Support', types: [FIELD_TYPE.User] },
  // Department and Departments are merged; either one may be absent from a table.
  { name: 'Department', types: [FIELD_TYPE.MultiSelect], optional: true, note: 'merged with Departments' },
  { name: 'Departments', types: [FIELD_TYPE.MultiSelect], optional: true, note: 'merged with Department' },
  { name: 'Start date', types: [FIELD_TYPE.DateTime] },
  { name: 'Estimate Deadline', types: [FIELD_TYPE.DateTime] },
  { name: 'Actual End Date', types: [FIELD_TYPE.DateTime] },
  { name: 'Priority', types: [FIELD_TYPE.SingleSelect], options: PRIORITY_OPTIONS },
  { name: 'Progress notes', types: [FIELD_TYPE.Text] },
  { name: 'Task summary', types: [FIELD_TYPE.Text] },
  {
    name: 'PROJECT NAME (handover)',
    types: [FIELD_TYPE.Link, FIELD_TYPE.DuplexLink],
    linkTable: 'tbl5QmCHTiIgjUlE',
  },
  { name: 'Task Status', types: [FIELD_TYPE.SingleSelect], options: TASK_STATUS_OPTIONS },
];

/** Fields the app deliberately ignores. Not reported as unmapped. */
export const TASK_IGNORED_FIELDS = [
  '多行文本 4',
  'Text 5',
  'Images',
  'Related OKRs',
  'Task + Person',
  'Project Status (Handover)',
  'Overdue',
];

export const PROJECT_FIELDS: ExpectedField[] = [
  { name: 'PROJECT NAME', types: [] },
  { name: 'PROJECT TYPE', types: [] },
  { name: 'STATE', types: [] },
  { name: 'CAPACITY (kWp)', types: [] },
  { name: 'CURRENT CYCLE STATUS (O&M)', types: [] },
];
