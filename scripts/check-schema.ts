// npm run check-schema
// Reads the field list of every configured Lark Base table and compares it with
// config/schema.ts. Read-only: it never writes to the Base.
// Exit codes: 0 = matches, 1 = mismatches found, 2 = could not run (config, auth, network).

import { PROJECTS_SOURCE, TASK_SOURCES, type TaskSource } from '../config/task-sources.ts';
import { PROJECT_FIELDS, TASK_FIELDS, TASK_IGNORED_FIELDS, fieldTypeName } from '../config/schema.ts';
import { listFields, listTables, type LarkField } from '../lib/lark/bitable.ts';
import { LarkConfigError, larkEnv } from '../lib/lark/env.ts';
import { LarkApiError } from '../lib/lark/client.ts';
import { compareTable, type TableReport } from '../lib/schema/compare.ts';

const mark = { error: '✗', warning: '!', info: '·' } as const;

function printReport(r: TableReport, fields: LarkField[], showTypes: boolean): void {
  console.log(`\n▸ ${r.label}  (${r.tableId})  ${fields.length} fields in Lark`);
  for (const m of r.matched) {
    const issue = r.issues.find((i) => i.field === m.field && i.level === 'error');
    if (!issue) console.log(`  ✓ ${m.field}${showTypes ? `  [${m.type}]` : ''}`);
  }
  for (const i of r.issues) console.log(`  ${mark[i.level]} ${i.field}: ${i.message}`);
  if (r.unmapped.length) console.log(`  · Not used by the app: ${r.unmapped.map((n) => `"${n}"`).join(', ')}`);
}

async function main(): Promise<number> {
  let env;
  try {
    env = larkEnv();
  } catch (e) {
    if (e instanceof LarkConfigError) {
      console.error(`Cannot run: ${e.message}.`);
      console.error('Set them in .env.local (local) or as environment variables, then run again.');
      return 2;
    }
    throw e;
  }

  console.log('Maqo Command Center: Lark Base schema check');
  console.log(`Base ${env.baseToken.slice(0, 6)}…  (read-only)`);

  const tables = await listTables(env.baseToken);
  const tableName = new Map(tables.map((t) => [t.table_id, t.name]));

  const sources: { src: TaskSource; kind: 'task' | 'project' }[] = [
    ...TASK_SOURCES.map((src) => ({ src, kind: 'task' as const })),
    { src: PROJECTS_SOURCE, kind: 'project' as const },
  ];

  let errors = 0;
  let warnings = 0;
  for (const { src, kind } of sources) {
    const name = tableName.get(src.tableId);
    if (!name) {
      console.log(`\n▸ ${src.label}  (${src.tableId})`);
      console.log('  ✗ Table not found in this Base, or the app cannot see it.');
      errors++;
      continue;
    }
    const fields = await listFields(env.baseToken, src.tableId);
    const report =
      kind === 'task'
        ? compareTable(src.tableId, `${src.label} — "${name}"`, TASK_FIELDS, fields, TASK_IGNORED_FIELDS)
        : compareTable(src.tableId, `${src.label} — "${name}" (projects)`, PROJECT_FIELDS, fields);

    if (kind === 'task') {
      const hasDept = fields.some((f) => f.field_name === 'Department' || f.field_name === 'Departments');
      if (!hasDept) {
        report.issues.push({
          level: 'error',
          field: 'Department / Departments',
          message: 'Neither field exists, so tasks in this table have no department.',
        });
      }
    }
    printReport(report, fields, kind === 'project');
    if (kind === 'project') {
      const primary = fields.find((f) => f.is_primary);
      if (primary) console.log(`  · Primary field: "${primary.field_name}" [${fieldTypeName(primary.type)}]`);
    }
    errors += report.issues.filter((i) => i.level === 'error').length;
    warnings += report.issues.filter((i) => i.level === 'warning').length;
  }

  console.log(`\nResult: ${errors} mismatch${errors === 1 ? '' : 'es'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log(errors ? 'Schema check FAILED.' : 'Schema check PASSED.');
  return errors ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    if (e instanceof LarkApiError) {
      console.error(`\nCannot run: ${e.message}`);
      if (e.path.includes('/bitable/')) {
        console.error('Check that the app has the bitable:app:readonly scope and is added to the Base as a collaborator.');
      } else {
        console.error('Check LARK_APP_ID and LARK_APP_SECRET.');
      }
    } else {
      console.error('\nCannot run:', e instanceof Error ? e.message : e);
    }
    process.exit(2);
  },
);
