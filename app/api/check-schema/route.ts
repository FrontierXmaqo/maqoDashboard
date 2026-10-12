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
  // shortcut: temporary check of which C&I table's closed deals match the Target table, remove after.
  try {
    for (const [t, st, kw, tot, pic] of [
      ['tblSVoYfNQq4BoDm', 'Client Status', 'System Size (kWp)', 'Total (RM)', 'Sales PIC'],
      ['tblpBSsofNilaC3G', 'Client Status', 'System Size (kWp)', 'Total Project Value (PV)', 'Sales PIC'],
    ] as const) {
      const recs = await searchAllRecords(SALES_BASES[1].token, t);
      const agg: Record<string, [number, number, number]> = {};
      for (const r of recs) {
        const f = r.fields ?? {};
        const s = JSON.stringify(f[st] ?? '').toLowerCase();
        if (!s.includes('closed')) continue;
        const who = (f[pic] as { name?: string }[] | undefined)?.[0]?.name ?? '?';
        const v = (x: unknown): number => (typeof x === 'number' ? x : (x as { value?: number[] })?.value?.[0] ?? 0);
        const a = (agg[who + ' ' + JSON.stringify(f['Year'] ?? '')] ??= [0, 0, 0]);
        a[0]++; a[1] += v(f[tot]); a[2] += v(f[kw]);
      }
      lines.push(`\n--- closed in ${t} (${recs.length} rows): ${JSON.stringify(agg)}`);
    }
  } catch (e) {
    lines.push(`  closed check failed: ${e instanceof Error ? e.message : String(e)}`);
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
