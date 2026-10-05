// Plain data shapes shared by the server loaders and the browser UI. No secrets here.

export type Stage = 'todo' | 'ongoing' | 'stalled' | 'done' | 'notset';
export type Priority = 'high' | 'normal' | null;

export type PersonRef = {
  openId: string;
  name: string;
  avatarUrl: string | null;
};

export type Task = {
  /** `${sourceTableId}:${recordId}`, unique across all task tables. */
  id: string;
  recordId: string;
  sourceTableId: string;
  sourceLabel: string;
  title: string;
  /** Task Responsible. Counts toward workload. */
  assignees: PersonRef[];
  /** Task Accountable. Shown as owner. */
  accountable: PersonRef[];
  /** Task Support. Shown only. */
  support: PersonRef[];
  /** App departments, from Department ∪ Departments. */
  departments: string[];
  /** Raw Lark option names, for Settings and debugging. */
  rawDepartments: string[];
  start: number | null;
  due: number | null;
  completedAt: number | null;
  priority: Priority;
  notes: string;
  summary: string;
  projectIds: string[];
  /** Exact Lark Task Status option, or null when empty. */
  statusRaw: string | null;
  stage: Stage;
  /** Status is "O&M Stage" (shown as Ongoing with a badge). */
  omStage: boolean;
};

export type Project = {
  id: string;
  name: string;
  type: string;
  state: string;
  capacity: string;
  cycleStatus: string;
};

export type Person = PersonRef & {
  jobTitle: string;
  /** App department, or null when unknown. */
  dept: string | null;
  larkDepartments: string[];
  /** 'contacts' = from the org chart; 'tasks' = only seen on tasks. */
  source: 'contacts' | 'tasks';
  /**
   * Open tasks as Task Responsible across ALL tables, set when the snapshot is scoped to a
   * leader or employee, so "free" stays accurate even when some of the person's tasks are
   * outside the viewer's departments.
   */
  openTotal?: number;
};

export type Snapshot = {
  generatedAt: number;
  tasks: Task[];
  projects: Project[];
  people: Person[];
  /** Lark department name -> app department (or null), for the Settings page. */
  departmentMap: { lark: string; app: string | null }[];
  sources: { tableId: string; label: string; count: number | null }[];
  warnings: string[];
  freeThreshold: number;
  overloadedAt: number;
};
