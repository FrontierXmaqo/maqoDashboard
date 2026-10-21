// GET /api/check-schema: the same read-only report as `npm run check-schema`, as plain text.
// Turned off on production deployments. Preview deployments sit behind Vercel Authentication.

import { runSchemaCheck } from '../../../lib/schema/run.ts';
import { listFields, listTables } from '../../../lib/lark/bitable.ts';
import { fieldTypeName } from '../../../config/schema.ts';
import { loadLicensing } from '../../../lib/data/licensing.ts';
import { licensingSummary } from '../../../lib/licensing-model.ts';

/** What the Licensing page reads from the live rows: counts and how often each field is filled. No names. */
async function licensingLines(): Promise<string[]> {
  const { rows, warnings } = await loadLicensing();
  const out = ['\n\n=== Licensing page, as read from the live rows', ...warnings.map((w) => `  ✗ ${w}`)];
  for (const cat of ['Resi', 'C&I'] as const) {
    const list = rows.filter((l) => l.category === cat);
    const s = licensingSummary(list, Date.now());
    const filled = (k: string, n: number) => `${k} ${n}/${list.length}`;
    out.push(`\n▸ ${cat}: ${list.length} rows, ${s.done} fully approved, ${s.inProgress} in progress, ${s.pendingDocs} docs pending, ${s.stale} stale`);
    out.push(`  filled: ${[
      filled('sales', list.filter((l) => l.sales.length).length),
      filled('atap', list.filter((l) => l.atapStatus).length),
      filled('docs', list.filter((l) => l.documentsStatus).length),
      filled('submitted', list.filter((l) => l.submittedAt).length),
      filled('declLink', list.filter((l) => l.declarationLink).length),
      filled('signed', list.filter((l) => l.signedForm).length),
      filled('kwp', list.filter((l) => l.kwp != null).length),
      filled('type', list.filter((l) => l.type).length),
      filled('lastUpdate', list.filter((l) => l.lastUpdate).length),
      filled('chat', list.filter((l) => l.chatLink).length),
    ].join(', ')}`);
    if (cat === 'Resi') out.push(`  stages: ${s.stages.map((x) => `${x.stage} ${x.n}`).join(' / ')}`);
    else for (const a of s.authorities) out.push(`  ${a.name}: ${a.statuses.map((x) => `${x.status} ${x.n}`).join(' / ')}`);
  }
  return out;
}

export const dynamic = 'force-dynamic';

// Sales Bases the dashboard will read next. Listed here only to learn their tables and fields.
const SALES_BASES = [
  { label: 'Residential sales', token: 'Ec88b000TaIsdGsEznLl8i2dgve' },
  { label: 'C&I sales', token: 'YLOSbdnx6a53O9sVwCflo8adgad' },
  { label: 'Resi licensing', token: 'EKRNbzjUhaqyKbsfLYAlAv5Fggc' },
  { label: 'C&I licensing', token: 'VidWbpYqcalYncsmVIAlPRLYgtg' },
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
  return lines;
}

export async function GET(): Promise<Response> {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  const { exitCode, lines } = await runSchemaCheck();
  const extra = [...(await salesBaseLines()), ...(await licensingLines())];
  return new Response(`${lines.join('\n')}\n\nExit code: ${exitCode}\n${extra.join('\n')}\n`, {
    status: exitCode === 2 ? 503 : 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
