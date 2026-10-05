// Small in-memory cache for server-side Lark reads. Each serverless instance keeps its own
// copy; entries expire after their TTL and can be dropped early with invalidate().

type Entry = { value: unknown; expiresAt: number };

// Kept on globalThis so pages and API routes share one cache even when the framework loads
// this module more than once in the same server process; otherwise a write could not clear
// the cache that pages read from.
const g = globalThis as typeof globalThis & { __maqoCache?: { store: Map<string, Entry>; inflight: Map<string, Promise<unknown>> } };
g.__maqoCache ??= { store: new Map(), inflight: new Map() };
const { store, inflight } = g.__maqoCache;

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Drops every entry whose key starts with the prefix (all entries when omitted). */
export function invalidate(prefix = ''): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
