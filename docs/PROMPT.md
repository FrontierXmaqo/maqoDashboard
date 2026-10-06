# Build: Maqo Command Center (Lark Base → Next.js on Vercel → Lark web app)

## Objective
Build a Next.js web app, deployed on Vercel and opened inside Lark as a custom web app. It shows Maqo's CEO, department leaders and employees who is working on which task and who is free. All data is read live from an existing Lark Base, and leaders can create, assign and update tasks with each change written back to that Base.

## Context (carry forward — these decisions are locked)
- **Design reference:** `reference/command-center.html` is a finished single-file prototype ("Maqo Command Center"). Match its layout, navigation, views, colours, typography and interactions as closely as possible: Overview (Needs attention, Free for new tasks, Team availability, Project overview, Employee workload, Task progress), My work, Departments, Employees, Tasks, Projects, Calendar, Reports and Settings. It currently stores data in a browser runtime `db`. Replace that layer with the Lark Base API, and keep the UI.
- **Roles:** `ceo` sees all departments. `leader` sees their department(s) and can create, assign and edit tasks there; one division head leads two departments. `employee` sees their own tasks plus their department's tasks, read-only.
- **Departments (8, plus CEO Office):** Residential, C&I, Marketing, O&M, Engineering, Finance, HR, Procurement/Warehouse & Logistics, CEO Office.
- **The Base is incomplete.** Only some departments have task data. Wherever data is missing, show "Not set" or an empty state and keep rendering. A missing field or value MUST NEVER crash a page or an API route.
- **Lark region:** Lark international, Singapore tenant (`sg.larksuite.com`). The API base URL is `https://open.larksuite.com/open-apis`, NOT Feishu (`open.feishu.cn`).
- **Stack:** Next.js (App Router) + TypeScript on Vercel. All Lark API calls run server-side (route handlers or server actions). The App Secret MUST NEVER reach the browser.

## Data source
Base app_token: `NvYSbmF6aadBCvs0nhllBG5Zg1d`

### Task tables (merge into one task list)
| Table | Table ID |
|---|---|
| ✅ (PH)Task Breakdown | `tbllh9KcfhidHupv` |
| ✅ (O&M)Task Breakdown Copy | `tblG3imQ2abeqfC0` |

Both tables use the same field names. Keep `sourceTableId` and `recordId` on every task, because writes MUST go back to the table the task came from.

Put the task tables in a config list (`config/task-sources.ts`: table ID plus a label). Adding a new department's task table later should only mean adding one entry, provided it uses the same field names.

### Field mapping (task)
| App field | Lark field | Lark type | Rule |
|---|---|---|---|
| title | `Task` | text | |
| assignee | `Task Responsible` | user | Main assignee, used for workload and "free" |
| accountable | `Task Accountable` | user | Shown as owner/leader on the task |
| support | `Task Support` | user | Shown on the task; does NOT count toward workload |
| departments | `Department` ∪ `Departments` | multi-select | Read both and merge without duplicates. Read-only in the app; never written |
| start | `Start date` | datetime | |
| due | `Estimate Deadline` | datetime | |
| completedAt | `Actual End Date` | datetime | Set to now when a leader marks a task Completed |
| priority | `Priority` | single select | `Important` = high, `Normal` = normal |
| notes | `Progress notes` | text | Editable |
| summary | `Task summary` | text | Editable |
| project | `PROJECT NAME (handover)` | link | Links to the projects table below |
| status | `Task Status` | single select | See status mapping |
| overdue | computed | — | due < now AND status ≠ Completed. Ignore the Base's `Overdue` formula field |

Ignore these fields: `多行文本 4`, `Text 5`, `Images`, `Related OKRs`, `Task + Person`, `Project Status (Handover)`.

### Status mapping
The prototype's four stages are replaced by the Base's real options. The status dropdown MUST write only these exact option names.

| Lark `Task Status` | App stage | Notes |
|---|---|---|
| Not yet started | To do | open |
| Ongoing | Ongoing | open |
| O&M Stage | Ongoing (badge "O&M Stage") | open |
| Stalled | Stalled | open; always listed in "Needs attention" |
| Completed | Complete | closed |
| (empty) | Not set | counted as open |

The prototype's "Review" stage is removed everywhere, including the pipeline, filters and reports.

### Projects
Read projects from the table `O&M CNI HANDOVER,CONTACT INFO` (`tbl5QmCHTiIgjUlE`). Show `PROJECT NAME`, `PROJECT TYPE`, `STATE`, `CAPACITY (kWp)` and `CURRENT CYCLE STATUS (O&M)`, and treat the table as read-only. Resolve the tasks' `PROJECT NAME (handover)` links against this table. Do NOT use the `MASTER SUMMARY INFO` or `🎯 Team OKR Tasks` tables in this version.

### Employees, departments, roles
- There is no employees table. Get people and departments from the Lark Contacts API (org chart): name, avatar, `open_id`, department.
- Map Lark org-chart departments to the 9 app departments in `config/departments.ts`. Keep a manual override map, because Lark department names may not match exactly.
- Keep roles in `config/roles.ts`: CEO `open_id`s, each leader's `open_id` with their department list, and everyone else defaulting to employee. The Settings page shows this config read-only in v1.
- **On leave:** there is no data source yet. Show "Not set" and treat the person as available.
- **"Free" rule:** a person is free when their open assigned tasks (as `Task Responsible`) are ≤ `FREE_THRESHOLD`. The default is 0 (Free = no open tasks), and it lives in `config/app.ts`.

## Lark integration requirements
- **App auth:** obtain a `tenant_access_token` with App ID and Secret, cache it server-side until shortly before it expires, and refresh it automatically.
- **User identity:** the app opens inside Lark. Use the Lark web app login flow (H5 JSSDK auth code → server exchanges it for user identity → `open_id`) to find out who is viewing, then set a signed, httpOnly session cookie. If the app is opened outside Lark, show a "Please open this in Lark" page.
- **Reads:** list records with pagination (`page_token`; never assume a single page), across all task tables. Cache results for about 60 seconds, and invalidate the cache after any write.
- **Writes:** create records, and update the `Task Status`, `Task Responsible`, `Task Support`, `Estimate Deadline`, `Start date`, `Priority`, `Progress notes`, `Task summary`, `Task` and `Actual End Date` fields. Person fields are written as Lark user objects (`[{ "id": "<open_id>" }]`), and datetimes as millisecond timestamps.
- **Permissions:** enforce role permissions server-side on every write. A leader may write only to tasks whose departments intersect theirs, and the CEO may write to any task. Employees cannot write.
- **Timezone:** Asia/Kuala_Lumpur for all date display and "today" logic.
- **Verify against the docs:** check every endpoint path, request shape, OAuth step and permission scope against the current Lark Open Platform docs (`open.larksuite.com/document`) before using it. Do NOT rely on memory for Lark API details. List the exact scopes the app needs so I can enable them in the developer console.

## Environment variables (Vercel; never commit)
`LARK_APP_ID`, `LARK_APP_SECRET`, `LARK_BASE_TOKEN`, `SESSION_SECRET`, `FREE_THRESHOLD` (optional). Provide a `.env.example` containing names only.

## Phases and checkpoints
1. **Scaffold and schema check:** set up the Next.js project, the Lark client, and a script `npm run check-schema`. The script calls the Base's list-fields API for every configured table and compares the result with the mapping above, reporting any missing, renamed or retyped fields and any status options that differ. **STOP and show me the output before continuing.**
2. **Read-only dashboard:** build every page from the reference using live Base data, with "Not set" handling and no writes yet.
3. **Lark login and roles:** add the session, role resolution, and per-role views (employee, leader, CEO).
4. **Leader writes:** add create, assign, status and edit actions with server-side permission checks. **STOP before the first write and ask me for a test copy of the Base token. NEVER test writes against the live Base.**
5. **Deploy:** add Vercel config and a README covering env vars, the required Lark scopes, how to add the app as a Base collaborator, and how to register the Vercel URL as the Lark web app's homepage and redirect URL.

## Scope and action boundaries
- Work only inside this repository.
- Do NOT add features that are not listed here, such as notifications, recurring tasks, OKR views or leave integration. Those come later.
- Do NOT add a separate database. Lark Base is the only data store, and config files hold roles and settings.
- Stop and ask before: writing to any Lark Base, changing a Base's structure (adding fields or tables), deleting records, adding paid services, or adding dependencies beyond Next.js, React and a small date library.

## Acceptance criteria
- [ ] `npm run check-schema` passes against the Base, or clearly reports each mismatch.
- [ ] The dashboard loads with real data from both task tables, and empty fields show "Not set" with no errors.
- [ ] A task with an empty `Task Status`, no assignee or no deadline renders correctly everywhere.
- [ ] A CEO, a leader and an employee each see only what their role allows. Verify this with the three roles mocked in a dev mode.
- [ ] A leader's edit appears in the Lark Base within seconds and on the dashboard after refresh. An employee's write attempt is rejected with 403.
- [ ] The App Secret does not appear anywhere in the client bundle.
- [ ] Layout and visuals match `reference/command-center.html` on desktop and mobile, in light and dark themes.

## Progress reporting
After each phase, report what was completed, the files changed, and the actual output of any check or test. Ground every claim of "done" in a command result.
