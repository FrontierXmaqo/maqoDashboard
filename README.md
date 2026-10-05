# Maqo Command Center

Internal dashboard showing who is working on which task and who is free. Reads live
data from Lark Base, runs on Vercel and opens inside Lark as a web app.

Full brief: [docs/PROMPT.md](docs/PROMPT.md). Design reference:
[reference/command-center.html](reference/command-center.html).

## Status

Phase 4: leader writes, built and tested against a local mock only. Leaders and the CEO
can create, assign and edit tasks; every write is checked on the server. Writes are OFF
unless `LARK_WRITES_ENABLED=1`, and have not yet been run against any real Base.

Local development without Lark access: `LARK_FIXTURES=1 npm run dev` loads sample data
(never in production).

## Setup

Requires Node.js 22.18 or newer.

```bash
npm install
cp .env.example .env.local   # fill in values; never commit them
```

| Command | What it does |
|---|---|
| `npm run check-schema` | Reads every configured Lark table's fields and compares them with `config/schema.ts`. Read-only. Exit 0 = match, 1 = mismatches, 2 = could not run. |
| `npm test` | Unit tests, plus an end-to-end run of the schema check against a mock Lark API. |
| `npm run typecheck` | TypeScript check. |
| `npm run dev` / `npm run build` | Next.js. |

## Sign-in and roles

- Inside Lark, the app gets a one-time code from the Lark JSSDK (`tt.requestAccess`, or
  `tt.requestAuthCode` on older clients). The server exchanges it at
  `POST /authen/v2/oauth/token`, reads the person's `open_id` from
  `GET /authen/v1/user_info`, and sets a signed, httpOnly session cookie (12 hours).
- Opened outside Lark, the app shows "Please open this in Lark".
- Roles come from `config/roles.ts`: CEO `open_id`s, and each leader's `open_id` with the
  departments they lead. Everyone else is an employee of their org-chart department.
  Each person can see their own Lark ID on the Settings page; the CEO sees everyone's in
  the employee drawer.
- CEO sees everything. A leader sees their departments. An employee sees their own tasks
  plus their department's tasks. Data outside the role never reaches the browser.

Lark developer console for sign-in: enable the Web App capability with the Vercel URL as
its homepage, and add that URL under Security settings > Redirect URLs. Make the app
available to everyone who should use it.

Dev sign-in (mock roles): `/dev-login` lets you sign in as a CEO, a leader of any
departments, or an employee. It works in local development, and on Vercel preview
deployments only when `DEV_LOGIN=1`. It is always off in production. A red DEV SIGN-IN
badge shows while it's in use.

## CEO-only mode (current setting)

`CEO_ONLY_MODE = true` in `config/app.ts`: there is no Lark sign-in, everyone who opens the
deployment sees the full CEO view, and editing is off. Keep Vercel Deployment Protection
on while this is set, because the deployment is then the only lock on the data. Set it to
`false` to turn on Lark sign-in, the leader and employee views, and (with
`LARK_WRITES_ENABLED=1`) editing.

## Editing tasks

- Who: the CEO on any task; a leader on tasks whose departments include one they lead;
  employees never (the API answers 403). Leaders assign Task Responsible only to people in
  their departments.
- What is written: `Task`, `Task Status` (exact option names only), `Task Responsible`,
  `Task Support`, `Start date`, `Estimate Deadline`, `Priority`, `Progress notes`,
  `Task summary`, and `Actual End Date` (set to now when a task becomes Completed).
  People are written as `[{ "id": "<open_id>" }]`, dates as millisecond timestamps.
- New tasks: the app also writes `Department`, once, at creation, using an option that
  already exists in Lark (it never creates options). O&M tasks go to the O&M table, all
  other departments to the PH table (`createFor` in `config/task-sources.ts`).
- Never written: Department on existing tasks, the project link, or anything else.
- After a write the server clears its cache, so the change shows on the next refresh.
- Writes need the `bitable:app` scope and `LARK_WRITES_ENABLED=1`.

## Where things live

- `config/task-sources.ts`: task tables and the projects table. Add a department's task table here.
- `config/schema.ts`: the expected Lark field names, types and select options.
- `config/app.ts`: free threshold, timezone, Lark API base URL.
- `config/departments.ts`: the 9 departments and the Lark-name mapping overrides.
- `config/roles.ts`: CEO and leader `open_id`s.
- `lib/auth/`: session cookie, Lark code exchange, role resolution and server-side scoping.
- `lib/lark/`: server-only Lark client (token caching, pagination, Base reads).

## Lark scopes needed so far

| Scope | Why |
|---|---|
| `bitable:app:readonly` | List tables and fields, search records |
| `bitable:app` | Create and update task records (Phase 4) |
| `contact:contact.base:readonly` | Call the org-chart APIs |
| `contact:department.base:readonly` | Department names |
| `contact:user.base:readonly` | People's names and avatars (org chart and person fields on tasks) |
| `contact:user.department:readonly` | Which department each person belongs to |

Also: add the app to the Base as a collaborator, and set the app's contacts
visibility range to the whole company (developer console > Permissions). Web app login
scopes are added in Phase 3.

Rules the dashboard applies: a task is overdue when its Estimate Deadline day (Kuala
Lumpur time) is before today and its status is not Completed. A person is free at
FREE_THRESHOLD (default 3) or fewer open tasks as Task Responsible, and overloaded at 5
or more.
