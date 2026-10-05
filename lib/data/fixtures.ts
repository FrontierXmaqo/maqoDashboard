// Sample Lark-shaped records for local development without Lark access.
// Only active when LARK_FIXTURES=1 and NODE_ENV is not production. Names are placeholders.

import type { LarkRecord } from '../lark/records.ts';

export function fixturesEnabled(): boolean {
  return process.env.LARK_FIXTURES === '1' && process.env.NODE_ENV !== 'production';
}

const DAY = 86_400_000;
const at = (days: number) => {
  // Midnight Kuala Lumpur time (UTC+8), like a Lark date-only field.
  const now = Date.now() + 8 * 3600_000;
  return Math.floor(now / DAY) * DAY - 8 * 3600_000 + days * DAY;
};
const u = (id: string, en: string) => [{ id, name: en, en_name: en, avatar_url: '' }];
const t = (s: string) => [{ type: 'text', text: s }];

const P = {
  a: u('ou_a', 'Sample Leader A'),
  b: u('ou_b', 'Sample Staff B'),
  c: u('ou_c', 'Sample Staff C'),
  d: u('ou_d', 'Sample Leader D'),
  e: u('ou_e', 'Sample Staff E'),
  f: u('ou_f', 'Sample Staff F'),
  g: u('ou_g', 'Sample Staff G'),
};

const PROJECTS: LarkRecord[] = [
  { record_id: 'recP1', fields: { 'PROJECT NAME': t('Sample Factory 1.2MWp'), 'PROJECT TYPE': 'C&I Rooftop', STATE: 'Selangor', 'CAPACITY (kWp)': 1200, 'CURRENT CYCLE STATUS (O&M)': 'Cycle 2' } },
  { record_id: 'recP2', fields: { 'PROJECT NAME': t('Sample Warehouse 450kWp'), 'PROJECT TYPE': 'C&I Rooftop', STATE: 'Johor', 'CAPACITY (kWp)': 450 } },
  { record_id: 'recP3', fields: { 'PROJECT NAME': t('Sample Mall BESS 261kWh'), STATE: 'Penang' } },
  { record_id: 'recP4', fields: {} },
];

const PH: LarkRecord[] = [
  { record_id: 'rec1', fields: { Task: t('Structural roof survey'), 'Task Responsible': P.e, 'Task Accountable': P.d, Department: ['C&I'], 'Task Status': 'Completed', Priority: 'Important', 'Start date': at(-20), 'Estimate Deadline': at(-12), 'Actual End Date': at(-13), 'PROJECT NAME (handover)': { link_record_ids: ['recP1'] } } },
  { record_id: 'rec2', fields: { Task: t('Single-line diagram'), 'Task Responsible': P.e, 'Task Accountable': P.d, 'Task Support': P.f, Departments: ['C&I', 'Engineering'], 'Task Status': 'Ongoing', Priority: 'Important', 'Estimate Deadline': at(2), 'PROJECT NAME (handover)': { link_record_ids: ['recP1'] }, 'Progress notes': t('Waiting for TNB meter data.') } },
  { record_id: 'rec3', fields: { Task: t('NEM application'), 'Task Responsible': P.e, Department: ['C&I'], 'Task Status': 'Not yet started', Priority: 'Normal', 'Estimate Deadline': at(9), 'PROJECT NAME (handover)': { link_record_ids: ['recP1'] } } },
  { record_id: 'rec4', fields: { Task: t('Panel delivery schedule'), 'Task Responsible': P.e, Department: ['C&I'], 'Task Status': 'Not yet started', 'Estimate Deadline': at(14) } },
  { record_id: 'rec5', fields: { Task: t('Cable sizing review'), 'Task Responsible': P.e, Department: ['Engineering'], 'Task Status': 'Ongoing', 'Estimate Deadline': at(-1) } },
  { record_id: 'rec6', fields: { Task: t('BESS savings proposal'), 'Task Responsible': P.f, 'Task Accountable': P.d, Department: ['C&I'], 'Task Status': 'Stalled', Priority: 'Important', 'Estimate Deadline': at(0), 'PROJECT NAME (handover)': { link_record_ids: ['recP3'] }, 'Task summary': t('Client reviewing tariff data.') } },
  { record_id: 'rec7', fields: { Task: t('Facebook ad creatives'), 'Task Responsible': P.g, 'Task Accountable': P.a, Department: ['Marketing'], 'Task Status': 'Ongoing', 'Estimate Deadline': at(1) } },
  // Edge cases: empty status, no assignee, no deadline, unknown status, missing fields.
  { record_id: 'rec8', fields: { Task: t('Landing page copy'), Department: ['Marketing'] } },
  { record_id: 'rec9', fields: { Task: t('Site visit, Puchong'), 'Task Responsible': P.b, 'Task Status': 'On hold' } },
  { record_id: 'rec10', fields: {} },
  { record_id: 'rec11', fields: { Task: t('Customer testimonial video'), 'Task Responsible': [...P.g, ...P.b], Department: ['Marketing'], 'Task Status': 'Not yet started', 'Estimate Deadline': at(5) } },
];

const OM: LarkRecord[] = [
  { record_id: 'rec21', fields: { Task: t('Panel cleaning, Shah Alam'), 'Task Responsible': P.c, 'Task Accountable': P.a, Department: ['O&M'], 'Task Status': 'O&M Stage', Priority: 'Important', 'Estimate Deadline': at(-3), 'PROJECT NAME (handover)': { link_record_ids: ['recP2'] } } },
  { record_id: 'rec22', fields: { Task: t('Inverter health check'), 'Task Responsible': P.c, Department: ['O&M'], 'Task Status': 'Not yet started', 'Estimate Deadline': at(2), 'PROJECT NAME (handover)': { link_record_ids: ['recP2'] } } },
  { record_id: 'rec23', fields: { Task: t('Monthly generation report'), 'Task Responsible': P.c, Departments: ['O&M'], 'Task Status': 'Completed', 'Estimate Deadline': at(-4), 'Actual End Date': at(-2), 'PROJECT NAME (handover)': { link_record_ids: ['recP2', 'recMissing'] } } },
  { record_id: 'rec24', fields: { Task: t('Spare parts count'), 'Task Responsible': P.c, Department: ['O&M'], 'Task Status': 'Ongoing', 'Estimate Deadline': at(6) } },
  { record_id: 'rec25', fields: { Task: t('Warranty claim follow-up'), 'Task Responsible': P.c, Department: ['O&M'], 'Task Status': 'Ongoing' } },
  { record_id: 'rec26', fields: { Task: t('Quarterly O&M visit'), 'Task Responsible': P.c, Department: ['O&M'], 'Task Status': 'Not yet started', 'Estimate Deadline': at(20) } },
];

// Shared across module copies (pages and API routes) so local writes show up on refresh.
const g = globalThis as typeof globalThis & { __maqoFixtures?: Record<string, LarkRecord[]> };
g.__maqoFixtures ??= { tbllh9KcfhidHupv: PH, tblG3imQ2abeqfC0: OM, tbl5QmCHTiIgjUlE: PROJECTS };

export function fixtureRecords(tableId: string): LarkRecord[] {
  return g.__maqoFixtures![tableId] ?? [];
}

// ---- Writes (local dev only): mutate the sample records in memory. ----

const KNOWN_USERS = new Map(Object.values(P).map((list) => [list[0].id, list[0]]));

function toStored(v: unknown): unknown {
  if (Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'id' in x)) {
    return v.map((x) => KNOWN_USERS.get((x as { id: string }).id) ?? { id: (x as { id: string }).id, name: (x as { id: string }).id, en_name: (x as { id: string }).id });
  }
  if (typeof v === 'string') return [{ type: 'text', text: v }];
  return v;
}

const SELECTS = new Set(['Task Status', 'Priority']);

export function fixtureWrite(tableId: string, recordId: string | null, fields: Record<string, unknown>): string {
  const table = fixtureRecords(tableId);
  let rec = recordId ? table.find((r) => r.record_id === recordId) : undefined;
  if (recordId && !rec) throw new Error(`Record ${recordId} not found`);
  if (!rec) {
    rec = { record_id: `recNew${Date.now().toString(36)}`, fields: {} };
    table.push(rec);
  }
  for (const [k, v] of Object.entries(fields)) {
    if (v === null) delete rec.fields[k];
    else rec.fields[k] = SELECTS.has(k) || Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : toStored(v);
  }
  return rec.record_id;
}

export function fixtureFields(): { field_name: string; type: number; property?: { options: { name: string }[] } }[] {
  return [{ field_name: 'Department', type: 4, property: { options: ['CEO Office', 'Residential', 'C&I', 'Marketing', 'O&M', 'Engineering', 'Finance', 'HR', 'Procurement/Warehouse & Logistics'].map((name) => ({ name })) } }];
}
