# Maqo Command Center

Internal dashboard showing who is working on which task and who is free. It reads live
data from Lark Base, runs on Vercel, and opens inside Lark as a web app.

- Brief: [docs/PROMPT.md](docs/PROMPT.md)
- Design reference: [reference/command-center.html](reference/command-center.html)
- Stack: Next.js (App Router) + TypeScript on Vercel. All Lark calls run on the server; the
  App Secret never reaches the browser.

## Current status

| Part | State |
|---|---|
| Live dashboard (Overview, Departments, Employees, Tasks, Projects, Calendar, Reports, Settings) | On |
| **CEO-only mode** (no sign-in, everyone sees the CEO view, no editing) | **On** (`CEO_ONLY_MODE` in `config/app.ts`) |
| Lark sign-in, leader and employee views | Built, switched off by CEO-only mode |
| Editing tasks (create, assign, status, notes) | Built and mock-tested, switched off. Not yet run against any real Base |

While CEO-only mode is on, **keep Vercel Deployment Protection on** (Project > Settings >
Deployment Protection). With no Lark sign-in, it is the only lock on the data.

## Environment variables (Vercel > Settings > Environment Variables)

Set values in Vercel only. Never commit them. `.env.example` lists the names.

| Name | Needed | What it is |
|---|---|---|
| `LARK_APP_ID` | Yes | Lark developer console > your app > Credentials & Basic Info > App ID |
| `LARK_APP_SECRET` | Yes | Same page, App Secret. Server-only |
| `LARK_BASE_TOKEN` | Yes | The Base's app token: the part after `/base/` in its URL (`NvYSbmF6aadBCvs0nhllBG5Zg1d`) |
| `LARK_BASE_TOKEN_TEST` | No | Test Base token (a copy of the live Base). Set it for **Preview** only: previews then read the test Base, production keeps reading `LARK_BASE_TOKEN`. Copied tables are found by name, so keep table names as in the live Base |
| `SESSION_SECRET` | When sign-in is on | 32+ random characters, e.g. `openssl rand -base64 48`. Signs the session cookie |
| `FREE_THRESHOLD` | No | Open tasks at or below this = Free. Default 0 (Free = no open tasks, Working = 1–4, Overloaded = 5+) |
| `LARK_WRITES_ENABLED` | No | `1` turns editing on (only when CEO-only mode is off). Leave empty until writes are approved |
| `DEV_LOGIN` | No | Preview deployments only: `1` allows `/dev-login` mock sign-in. Never set in Production |

Tick **Production** and **Preview** for the Lark variables if you want preview links to
show real data. For testing, set `LARK_BASE_TOKEN_TEST` (Preview) to a **copy** of the Base, and add the
app to that copy as well. Previews then show a "Test data" banner. After changing variables, redeploy: Vercel only reads them at
build time for new deployments.

## Lark setup (developer console: open.larksuite.com/app)

### 1. Permissions (Permissions & Scopes)

| Scope | Why | Needed now |
|---|---|---|
| `bitable:app:readonly` | Read tables, fields and records | Yes |
| `contact:contact.base:readonly` | Call the org-chart APIs | Yes |
| `contact:department.base:readonly` | Department names | Yes |
| `contact:user.base:readonly` | Names and avatars (org chart and person fields on tasks) | Yes |
| `contact:user.department:readonly` | Each person's department | Yes |
| `bitable:app` | Create and update task records | Only when editing is turned on |

Then set the app's **contacts visibility range** to the whole company, and publish a new
version of the app so the scopes take effect (Version Management & Release).

### 2. Add the app to the Base

The app reads the Base as itself, so it needs access like any collaborator:

1. Open the Base in Lark.
2. Top-right **…** > **…More** > **Add document app**.
3. Search for the app and add it. Read access is enough for now; give **Can edit** when
   editing is turned on. If the Base uses advanced permissions, give the app **Can manage**,
   otherwise record reads come back empty.

The app only shows up in that search after at least one Base permission (step 1) is enabled.

### 3. Web app (needed when CEO-only mode is turned off)

1. **Features > Web App**: set the desktop and mobile homepage to the Vercel production URL
   (`https://maqodashboard.vercel.app`, or your custom domain).
2. **Security Settings > Redirect URLs**: add the same URL.
3. **Availability**: make the app available to everyone who should use it.
4. Publish a new version.

Staff then open it from Lark Workplace. Inside Lark the app signs people in automatically
(JSSDK `tt.requestAccess`, falling back to `tt.requestAuthCode`; the server exchanges the
code at `POST /authen/v2/oauth/token` and reads the `open_id` from `GET /authen/v1/user_info`).
Opened outside Lark it shows "Please open this in Lark".

## Deploying

The Vercel project `maqodashboard` is linked to this GitHub repo. Every push to `main`
deploys to production; every other branch gets a preview link. Functions run in Singapore
(`sin1`, set in `vercel.json`), close to Lark's Singapore servers and to Malaysia.

To check the Base matches what the app expects, open `/api/check-schema` on a **preview**
link (it is turned off in production), or run `npm run check-schema` locally with a
`.env.local`. It lists missing, renamed or retyped fields and status options that differ.

## Roles (when CEO-only mode is off)

`config/roles.ts` holds CEO `open_id`s and each leader's `open_id` with their departments
(a division head can lead two). Everyone else is an employee of their org-chart
department. Each person sees their own Lark ID on the Settings page; the CEO sees
everyone's in the employee drawer.

| | CEO | Leader | Employee |
|---|---|---|---|
| Sees | Everything | Their departments | Own tasks + own department |
| Edits | Any task | Tasks in their departments; assigns their own people | Nothing (API answers 403) |

Data outside a viewer's role is removed on the server before it reaches the browser.

## How the data is read

- Task tables (`config/task-sources.ts`): `(PH) Task Breakdown` and `(O&M) Task Breakdown
  Copy`, merged. Add a department's table by adding one entry, if it uses the same field
  names (`config/schema.ts`).
- Projects: `O&M CNI HANDOVER,CONTACT INFO`, read-only.
- People and departments: the Lark org chart, mapped to the 9 app departments in
  `config/departments.ts` (fix wrong mappings in `LARK_DEPARTMENT_OVERRIDES`; Settings lists
  every Lark name and where it landed). People seen on tasks but not in the org chart are
  added with their department taken from their tasks.
- Missing values show as **Not set**; a table or the org chart that can't be read becomes a
  warning banner, never a crash.
- Reads are cached on the server for 60 seconds (org chart 10 minutes); the Refresh button
  reloads.
- Rules: overdue = Estimate Deadline day (Kuala Lumpur time) before today and status not
  Completed. Free = open tasks as Task Responsible ≤ `FREE_THRESHOLD`; overloaded = 5 or
  more. Task Support doesn't count toward workload. On leave: no data source yet, shown as
  Not set.

## Editing (when switched on)

- Writes only: `Task`, `Task Status` (exact options: Not yet started, Ongoing, O&M Stage,
  Stalled, Completed), `Task Responsible`, `Task Support`, `Start date`,
  `Estimate Deadline`, `Priority`, `Progress notes`, `Task summary`, and `Actual End Date`
  (set to now when a task becomes Completed). People as `[{ "id": "<open_id>" }]`, dates as
  millisecond timestamps.
- New tasks also get `Department`, once, using an option that already exists in Lark. O&M
  tasks go to the O&M table, others to the PH table.
- Never written: Department on existing tasks, the project link, anything else.

## Local development

Requires Node.js 22.18+.

```bash
npm install
cp .env.example .env.local   # fill in values; git ignores this file
npm run dev                  # http://localhost:3000
LARK_FIXTURES=1 npm run dev  # sample data, no Lark access needed (never in production)
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests plus mock-Lark end-to-end tests |
| `npm run typecheck` | TypeScript |
| `npm run check-schema` | Compare the live Base with `config/schema.ts` (read-only) |
| `npm run build` | Production build |

## Troubleshooting

| You see | Fix |
|---|---|
| "Lark is not connected on this deployment" | The Lark variables are missing for this environment (Production or Preview). Add them and redeploy |
| "Could not read tasks …" with a permission error | Add the app to the Base (Lark setup step 2) and check the scopes |
| Tables load but are empty | The Base uses advanced permissions: give the app Can manage |
| "Could not read the org chart" | Enable the contact scopes and set the contacts visibility range, then publish a new app version |
| Everyone's department is Not set | Org chart names don't map: add them to `LARK_DEPARTMENT_OVERRIDES` |
