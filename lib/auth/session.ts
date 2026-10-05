// Signed, httpOnly session cookie. Server-only. The payload is readable base64 JSON plus an
// HMAC-SHA256 signature made with SESSION_SECRET, so it can't be forged or edited.

import { createHmac, timingSafeEqual } from 'node:crypto';

if (typeof window !== 'undefined') throw new Error('lib/auth/session is server-only.');

export const SESSION_COOKIE = 'maqo_session';
export const SESSION_TTL_SECONDS = 12 * 3600;

export type Session = {
  openId: string;
  name: string;
  avatarUrl: string | null;
  /** Expiry, seconds since epoch. */
  exp: number;
  /** Dev mode only: a mocked role. Ignored unless dev sign-in is enabled. */
  dev?: { role: 'ceo' | 'leader' | 'employee'; depts: string[] };
};

export class SessionConfigError extends Error {}

function secret(): string {
  const s = process.env.SESSION_SECRET?.trim();
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== 'production') return 'dev-only-session-secret-not-for-production-use';
  throw new SessionConfigError('SESSION_SECRET is missing or shorter than 32 characters.');
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');

export function encodeSession(s: Omit<Session, 'exp'>, ttl = SESSION_TTL_SECONDS): string {
  const body = b64(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + ttl }));
  return `${body}.${sign(body)}`;
}

export function decodeSession(raw: string | undefined | null): Session | null {
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    if (typeof s.openId !== 'string' || !s.openId || typeof s.exp !== 'number') return null;
    if (s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge = SESSION_TTL_SECONDS) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/** Dev sign-in: local development, or a Vercel preview with DEV_LOGIN=1. Never production. */
export function devLoginEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.VERCEL_ENV === 'preview' && process.env.DEV_LOGIN === '1';
}
