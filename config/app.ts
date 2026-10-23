// App-wide settings. Server and client may both import this file: it holds no secrets.

export const LARK_API_BASE = 'https://open.larksuite.com/open-apis';

export const TIMEZONE = 'Asia/Kuala_Lumpur';

const DEFAULT_FREE_THRESHOLD = 0;

/** A person is free when their open tasks as Task Responsible are at or below this. */
export function freeThreshold(): number {
  const raw = typeof process !== 'undefined' ? process.env.FREE_THRESHOLD : undefined;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FREE_THRESHOLD;
}

/** Cached Base reads are reused for this long, then fetched again. */
export const READ_CACHE_SECONDS = 60;

/** Open tasks at or above this count = "Overloaded". Always above the free threshold. */
export function overloadedAt(): number {
  return Math.max(5, freeThreshold() + 1);
}

/** Org-chart reads change rarely; reuse them for longer than Base reads. */
export const CONTACTS_CACHE_SECONDS = 600;

/**
 * CEO-only mode: no Lark sign-in, everyone who can reach the deployment sees the full CEO
 * view, and editing is off. Off now: the app opens inside Lark and signs people in with
 * their Lark account (roles in config/roles.ts). If set back to true, turn Vercel
 * Deployment Protection on again: the deployment itself is then the only lock on the data.
 */
export const CEO_ONLY_MODE = false;
