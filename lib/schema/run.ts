// Runs the schema check and returns the report as text lines.
// Shared by `npm run check-schema` and the /api/check-schema route. Read-only.

import { PROJECTS_SOURCE, TASK_SOURCES, type TaskSource } from '../../config/task-sources.ts';
import { PROJECT_FIELDS, TASK_FIELDS, TASK_IGNORED_FIELDS, fieldTypeName } from '../../config/schema.ts';
import { listFields, listTables, type LarkField } from '../lark/bitable.ts';
import { LarkConfigError, larkEnv } from '../lark/env.ts';
import { LarkApiError } from '../lark/client.ts';
import { compareTable, type TableReport } from './compare.ts';

export type SchemaCheckResult = {
  /** 0 = matches, 1 = mismatches found, 2 = could not run. */
  exitCode: 0 | 1 | 2;
  lines: string[];
};

const mark = { error: '✗', warning: '!', info: '·' } as const;

function reportLines(r: TableReport, fields: LarkField[], showTypes: boolean): string[] {
  const out = [`\n▸ ${r.label}  (${r.tableId})  ${fields.length} fields in Lark`];
  for (const m of r.matched) {
    const issue = r.issues.find((i) => i.field === m.field && i.level === 'error');
    if (!issue) out.push(`  ✓ ${m.field}${showTypes ? `  [${m.type}]` : ''}`);
  }
  for (const i of r.issues) out.push(`  ${mark[i.level]} ${i.field}: ${i.message}`);
  if (r.unmapped.length) out.push(`  · Not used by the app: ${r.unmapped.map((n) => `"${n}"`).join(', ')}`);
  return out;
}

async function check(lines: string[]): Promise<0 | 1> {
  const env = larkEnv();
  lines.push('Maqo Command Center: Lark Base schema check');
  lines.push(`Base ${env.baseToken.slice(0, 6)}…  (read-only)`);

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
      lines.push(`\n▸ ${src.label}  (${src.tableId})`);
      lines.push('  ✗ Table not found in this Base, or the app cannot see it.');
      errors++;
      continue;
    }
    const fields = await listFields(env.baseToken, src.tableId);
    const report =
      kind === 'task'
        ? compareTable(src.tableId, `${src.label} — "${name}"`, TASK_FIELDS, fields, TASK_IGNORED_FIELDS)
        : compareTable(src.tableId, `${src.label} — "${name}" (projects)`, PROJECT_FIELDS, fields);

    if (kind === 'task' && !fields.some((f) => f.field_name === 'Department' || f.field_name === 'Departments')) {
      report.issues.push({
        level: 'error',
        field: 'Department / Departments',
        message: 'Neither field exists, so tasks in this table have no department.',
      });
    }
    lines.push(...reportLines(report, fields, kind === 'project'));
    if (kind === 'project') {
      const primary = fields.find((f) => f.is_primary);
      if (primary) lines.push(`  · Primary field: "${primary.field_name}" [${fieldTypeName(primary.type)}]`);
    }
    errors += report.issues.filter((i) => i.level === 'error').length;
    warnings += report.issues.filter((i) => i.level === 'warning').length;
  }

  lines.push(`\nResult: ${errors} mismatch${errors === 1 ? '' : 'es'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  lines.push(errors ? 'Schema check FAILED.' : 'Schema check PASSED.');
  return errors ? 1 : 0;
}

export async function runSchemaCheck(): Promise<SchemaCheckResult> {
  const lines: string[] = [];
  try {
    return { exitCode: await check(lines), lines };
  } catch (e) {
    if (e instanceof LarkConfigError) {
      lines.push(`Cannot run: ${e.message}.`);
      lines.push('Set them as environment variables (Vercel, or .env.local locally), then run again.');
    } else if (e instanceof LarkApiError) {
      lines.push(`\nCannot run: ${e.message}`);
      lines.push(
        e.path.includes('/bitable/')
          ? 'Check that the app has the bitable:app:readonly scope and is added to the Base as a collaborator.'
          : 'Check LARK_APP_ID and LARK_APP_SECRET.',
      );
    } else {
      lines.push(`\nCannot run: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { exitCode: 2, lines };
  }
}
