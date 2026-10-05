# Maqo Command Center

Internal dashboard showing who is working on which task and who is free. Reads live
data from Lark Base, runs on Vercel and opens inside Lark as a web app.

Full brief: [docs/PROMPT.md](docs/PROMPT.md). Design reference:
[reference/command-center.html](reference/command-center.html).

## Status

Phase 1 (scaffold and schema check). The dashboard pages come in Phase 2.

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
| `bitable:app:readonly` | List tables and fields, read records |
| `bitable:app` | Create and update task records (Phase 4) |

Contacts and web app login scopes are added and verified in Phase 3. The app must
also be added to the Base as a collaborator.
