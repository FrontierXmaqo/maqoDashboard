// GET /api/check-schema: the same read-only report as `npm run check-schema`, as plain text.
// Turned off on production deployments. Preview deployments sit behind Vercel Authentication.

import { runSchemaCheck } from '../../../lib/schema/run.ts';
import { listFields, listTables } from '../../../lib/lark/bitable.ts';
import { fieldTypeName } from '../../../config/schema.ts';
import { searchAllRecords } from '../../../lib/lark/records.ts';

export const dynamic = 'force-dynamic';

// Sales Bases the dashboard will read next. Listed here only to learn their tables and fields.
const SALES_BASES = [
  { label: 'Residential sales', token: 'Ec88b000TaIsdGsEznLl8i2dgve' },
  { label: 'C&I sales', token: 'YLOSbdnx6a53O9sVwCflo8adgad' },
];

async function salesBaseLines(): Promise<string[]> {
  const lines: string[] = [];
  for (const b of SALES_BASES) {
    lines.push(`\n\n=== ${b.label} Base ${b.token.slice(0, 6)}…  (read-only field list)`);
    try {
      for (const t of await listTables(b.token)) {
        const fields = await listFields(b.token, t.table_id);
        lines.push(`\n▸ "${t.name}"  (${t.table_id})  ${fields.length} fields`);
        for (const f of fields) {
          const opts = f.property?.options?.map((o) => o.name).join(' / ');
          lines.push(`  · ${f.field_name}  [${fieldTypeName(f.type)}]${opts ? `  options: ${opts}` : ''}`);
        }
      }
    } catch (e) {
      lines.push(`  ✗ Cannot read: ${e instanceof Error ? e.message : String(e)}`);
      lines.push('  Add the dashboard app to this Base (Base ⋯ menu > add app / collaborator) with read access.');
    }
  }
  // shortcut: temporary value sample of the C&I Target table, remove once mapped.
  try {
    const recs = await searchAllRecords(SALES_BASES[1].token, 'tbliUv5oMV1AVWCS');
    lines.push(`\n--- C&I Target rows (${recs.length})`);
    for (const r of recs) lines.push('  ' + JSON.stringify(r.fields).slice(0, 1500));
  } catch (e) {
    lines.push(`  target sample failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  return lines;
}

export async function GET(): Promise<Response> {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  const { exitCode, lines } = await runSchemaCheck();
  const extra = await salesBaseLines();
  return new Response(`${lines.join('\n')}\n\nExit code: ${exitCode}\n${extra.join('\n')}\n`, {
    status: exitCode === 2 ? 503 : 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
