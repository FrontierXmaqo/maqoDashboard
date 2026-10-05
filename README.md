# Maqo Command Center

Internal dashboard showing who is working on which task and who is free. Reads live
data from Lark Base, runs on Vercel and opens inside Lark as a web app.

Full brief: [docs/PROMPT.md](docs/PROMPT.md). Design reference:
[reference/command-center.html](reference/command-center.html).

## Status

Phase 2: read-only dashboard. All pages from the reference read live Lark data, with
"Not set" wherever a value is missing. Everyone sees the CEO view until Lark sign-in
(Phase 3). No writes yet (Phase 4).

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

## Where things live

- `config/task-sources.ts`: task tables and the projects table. Add a department's task table here.
- `config/schema.ts`: the expected Lark field names, types and select options.
- `config/app.ts`: free threshold, timezone, Lark API base URL.
- `config/departments.ts`, `config/roles.ts`: departments and role assignments (filled in Phase 3).
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
