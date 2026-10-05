// App-wide settings. Server and client may both import this file: it holds no secrets.

export const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

export const TIMEZONE = 'Asia/Kuala_Lumpur';

const DEFAULT_FREE_THRESHOLD = 3;

/** A person is free when their open tasks as Task Responsible are at or below this. */
export function freeThreshold(): number {
  const raw = typeof process !== 'undefined' ? process.env.FREE_THRESHOLD : undefined;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FREE_THRESHOLD;
}

/** Cached Base reads are reused for this long, then fetched again. */
export const READ_CACHE_SECONDS = 60;
