// Defensive readers for Lark Base field values. Shapes follow the Lark doc
// "Record data structure": text = [{type,text}] (string when written), single select = string,
// multi select = string[], date = ms timestamp, person = [{id,name,en_name,avatar_url}],
// link = { link_record_ids: [...] }. Anything unexpected returns an empty value, never throws.

import type { PersonRef } from '../types.ts';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function raw(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Rich text: [{ type, text }] segments, joined as written.
  if (Array.isArray(v)) return v.map((x) => (isObj(x) ? raw(x.text ?? x.name ?? x.link ?? '') : raw(x))).join('');
  if (isObj(v)) {
    // Formula / lookup: { type, value: [...] }
    if ('value' in v) return raw(v.value);
    if ('text' in v) return raw(v.text);
    if ('name' in v) return raw(v.name);
  }
  return '';
}

export function text(v: unknown): string {
  return raw(v).trim();
}

export function single(v: unknown): string | null {
  const s = Array.isArray(v) ? text(v[0]) : text(v);
  return s || null;
}

export function multi(v: unknown): string[] {
  if (v == null) return [];
  const list = Array.isArray(v) ? v : [v];
  return list.map((x) => text(x)).filter(Boolean);
}

export function datetime(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && /^\d{10,}$/.test(v)) return Number(v);
  if (isObj(v) && 'value' in v) return datetime(Array.isArray(v.value) ? v.value[0] : v.value);
  return null;
}

export function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  if (isObj(v) && 'value' in v) return num(Array.isArray(v.value) ? v.value[0] : v.value);
  return null;
}

export function users(v: unknown): PersonRef[] {
  if (!Array.isArray(v)) return [];
  const out: PersonRef[] = [];
  for (const u of v) {
    if (!isObj(u) || typeof u.id !== 'string' || !u.id) continue;
    const name = text(u.en_name) || text(u.name) || 'Not set';
    out.push({ openId: u.id, name, avatarUrl: typeof u.avatar_url === 'string' && u.avatar_url ? u.avatar_url : null });
  }
  return out;
}

export function links(v: unknown): string[] {
  if (v == null) return [];
  if (isObj(v) && Array.isArray(v.link_record_ids)) return v.link_record_ids.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(v)) {
    const ids: string[] = [];
    for (const x of v) {
      if (typeof x === 'string') ids.push(x);
      else if (isObj(x)) {
        if (Array.isArray(x.record_ids)) ids.push(...x.record_ids.filter((r): r is string => typeof r === 'string'));
        else if (Array.isArray(x.link_record_ids)) ids.push(...x.link_record_ids.filter((r): r is string => typeof r === 'string'));
        else if (typeof x.record_id === 'string') ids.push(x.record_id);
      }
    }
    return ids;
  }
  return [];
}

/** Any value as display text, for read-only columns whose type we don't control. */
export function display(v: unknown): string {
  const n = typeof v === 'number' ? v : null;
  if (n != null) return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v.join(', ');
  return text(v);
}
