// Licensing loader: the Resi ATAP table and the C&I licensing table, read-only. Server-only.
// Never throws: a table that can't be read becomes a warning and an empty list.

import { READ_CACHE_SECONDS } from '../../config/app.ts';
import { AUTHORITIES, ATAP_DONE, LICENSING_BASES, isApproved, type Licence, type LicensingCategory } from '../licensing-model.ts';
import type { SalesData } from '../sales-model.ts';
import { searchAllRecords, type LarkRecord } from '../lark/records.ts';
import { cached } from './cache.ts';
import { fixturesEnabled } from './fixtures.ts';
import { datetime, display, num, single, text, users } from './parse.ts';

type Fields = Record<string, unknown>;

/** First non-empty field by exact name, else by case-insensitive prefix (the Lark grid cuts long names off). */
function get(f: Fields, ...names: string[]): unknown {
  for (const n of names) if (f[n] != null && f[n] !== '') return f[n];
  const keys = Object.keys(f);
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase().startsWith(n.toLowerCase()));
    if (k && f[k] != null && f[k] !== '') return f[k];
  }
  return undefined;
}

/** Url fields come back as { link, text }; a plain string is accepted too. */
function url(v: unknown): string {
  const x = Array.isArray(v) ? v[0] : v;
  if (typeof x === 'string') return x.trim();
  if (x && typeof x === 'object' && typeof (x as { link?: unknown }).link === 'string') return (x as { link: string }).link;
  return '';
}

const files = (v: unknown) => (Array.isArray(v) ? v.length : 0);

const EMPTY = { projectId: '', documentsStatus: '', atapStatus: '', payment: null, declarationLink: '', signedForm: 0, cert: 0, type: '', kwp: null, authorities: [], chatLink: '', lastUpdate: null };

export function mapResiLicence(rec: LarkRecord): Licence {
  const f = rec.fields ?? {};
  const atapStatus = single(f['ATAP Application Status']) ?? '';
  return {
    ...EMPTY,
    id: rec.record_id,
    category: 'Resi',
    client: display(get(f, 'Client Name')),
    sales: users(get(f, 'Sales PIC')),
    remarks: '',
    done: atapStatus === ATAP_DONE,
    projectId: display(f['Project ID']),
    documentsStatus: single(get(f, 'Documents Status', 'Document Status')) ?? '',
    atapStatus,
    payment: num(f['eATAP Payment']),
    declarationLink: url(f['Submit Declaration Link']),
    signedForm: files(f['Signed Declaration Form']),
    cert: files(f['ATAP Cert']),
  };
}

const DATE_FIELD: Record<string, string> = { SEDA: 'SEDA DATE OF UPDATE', ST: 'ST DATE OF UPDATE', TNB: 'TNB DATE OF UPDATE', MGTC: 'DATE OF MGTC UPDATE' };

export function mapCiLicence(rec: LarkRecord): Licence {
  const f = rec.fields ?? {};
  const mgtcNeeded = (single(get(f, 'MGTC NEEDED')) ?? '').toUpperCase() === 'YES';
  const authorities = AUTHORITIES.filter((a) => a !== 'MGTC' || mgtcNeeded).map((name) => ({
    name,
    status: single(get(f, `${name} STATUS`)) ?? '',
    at: datetime(get(f, DATE_FIELD[name])),
  }));
  const dates = [...authorities.map((a) => a.at), datetime(get(f, 'CAS DATE OF UPDATE'))].filter((d): d is number => d != null);
  return {
    ...EMPTY,
    id: rec.record_id,
    category: 'C&I',
    client: display(get(f, 'CLIENT NAME 1', 'CLIENT NAME')),
    sales: users(get(f, 'SALES PIC')),
    remarks: text(get(f, 'Remark apa jadi', 'REMARKS')),
    done: authorities.length > 0 && authorities.every((a) => isApproved(a.status)),
    lastUpdate: dates.length ? Math.max(...dates) : null,
    type: display(get(f, 'TYPE OF APPLICATION')),
    kwp: num(get(f, 'KWP')),
    authorities,
    cert: files(get(f, 'ATAP CERT')),
    chatLink: url(get(f, 'Link Whatsapp Group')),
  };
}

const MAPPERS: Record<LicensingCategory, (r: LarkRecord) => Licence> = { Resi: mapResiLicence, 'C&I': mapCiLicence };

export async function loadLicensing(): Promise<SalesData<Licence[]>> {
  const warnings: string[] = [];
  const cats = Object.keys(LICENSING_BASES) as LicensingCategory[];
  const lists = await Promise.all(
    cats.map(async (c) => {
      if (fixturesEnabled()) return [];
      const { base, table } = LICENSING_BASES[c];
      try {
        const recs = await cached(`licensing:${table}`, READ_CACHE_SECONDS, () => searchAllRecords(base, table));
        return recs.map(MAPPERS[c]);
      } catch (e) {
        warnings.push(`Could not read the ${c} licensing table: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    }),
  );
  return { generatedAt: Date.now(), rows: lists.flat().filter((l) => l.client), warnings };
}
