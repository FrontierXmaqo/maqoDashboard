// Licensing loader: the Resi and C&I ATAP application tables, read-only. Server-only.
// Never throws: a table that can't be read becomes a warning and an empty list.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { LICENSING_BASES, type Licence, type LicensingCategory } from '../licensing-model.ts';
import type { SalesData } from '../sales-model.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { cached } from './cache.ts';
import { fixturesEnabled } from './fixtures.ts';
import { display, num, single, text, users } from './parse.ts';

const pick = (f: Record<string, unknown>, ...names: string[]) => names.map((n) => f[n]).find((v) => v != null && v !== '');

/** Url fields come back as { link, text }; a plain string is accepted too. */
function url(v: unknown): string {
  const x = Array.isArray(v) ? v[0] : v;
  if (typeof x === 'string') return x.trim();
  if (x && typeof x === 'object' && typeof (x as { link?: unknown }).link === 'string') return (x as { link: string }).link;
  return '';
}

export function mapLicence(rec: LarkRecord, category: LicensingCategory): Licence {
  const f = rec.fields ?? {};
  return {
    id: rec.record_id,
    category,
    client: display(pick(f, 'Client Name', 'Client')),
    projectId: display(f['Project ID']),
    documentsStatus: single(pick(f, 'Documents Status', 'Document Status')) ?? '',
    atapStatus: single(f['ATAP Application Status']) ?? '',
    payment: num(f['eATAP Payment']),
    sales: users(pick(f, 'Sales PIC', 'SC')),
    chatGroup: text(f['Chat Group']),
    declarationLink: url(f['Submit Declaration Link']),
    signedForm: Array.isArray(f['Signed Declaration Form']) ? f['Signed Declaration Form'].length : 0,
    cert: Array.isArray(f['ATAP Cert']) ? f['ATAP Cert'].length : 0,
  };
}

export async function loadLicensing(): Promise<SalesData<Licence[]>> {
  const warnings: string[] = [];
  const cats = Object.keys(LICENSING_BASES) as LicensingCategory[];
  const lists = await Promise.all(
    cats.map(async (c) => {
      if (fixturesEnabled()) return [];
      const { base, table } = LICENSING_BASES[c];
      try {
        const recs = await cached(`licensing:${table}`, READ_CACHE_SECONDS, () => searchAllRecords(base, table));
        return recs.map((r) => mapLicence(r, c));
      } catch (e) {
        warnings.push(`Could not read the ${c} licensing table: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    }),
  );
  return { generatedAt: Date.now(), rows: lists.flat().filter((l) => l.client || l.projectId), warnings };
}
