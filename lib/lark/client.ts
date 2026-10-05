// Minimal Lark Open Platform client: tenant_access_token caching and JSON requests.
// Endpoints checked against open.larksuite.com/document:
//   POST /auth/v3/tenant_access_token/internal  { app_id, app_secret }
//     -> { code, msg, tenant_access_token, expire (seconds, max 2h) }

import { LARK_API_BASE } from '../../config/app.ts';
import { larkEnv } from './env.ts';

/** Refresh this long before the token's stated expiry. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class LarkApiError extends Error {
  code: number;
  httpStatus: number;
  path: string;
  constructor(path: string, httpStatus: number, code: number, msg: string) {
    super(`Lark API ${path} failed: code ${code}, ${msg || `HTTP ${httpStatus}`}`);
    this.name = 'LarkApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.path = path;
  }
}

type CachedToken = { value: string; refreshAt: number };
let cached: CachedToken | null = null;
let inflight: Promise<string> | null = null;

/** Test hook. Lets tests point the client at a local mock server. */
function apiBase(): string {
  return process.env.LARK_API_BASE_FOR_TESTS || LARK_API_BASE;
}

async function fetchTenantToken(): Promise<CachedToken> {
  const { appId, appSecret } = larkEnv();
  const path = '/auth/v3/tenant_access_token/internal';
  const res = await fetch(apiBase() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (!res.ok || body.code !== 0 || !body.tenant_access_token) {
    throw new LarkApiError(path, res.status, body.code ?? -1, body.msg ?? '');
  }
  const expireMs = (body.expire ?? 7200) * 1000;
  return {
    value: body.tenant_access_token,
    refreshAt: Date.now() + Math.max(expireMs - REFRESH_MARGIN_MS, 30_000),
  };
}

export async function tenantAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.refreshAt) return cached.value;
  if (!inflight) {
    inflight = fetchTenantToken()
      .then((t) => {
        cached = t;
        return t.value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function clearTokenCache(): void {
  cached = null;
}

type LarkEnvelope<T> = { code?: number; msg?: string; data?: T };

/** Codes Lark returns for an invalid or expired access token. */
const TOKEN_ERROR_CODES = new Set([99991661, 99991663, 99991668]);

export async function larkRequest<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  opts: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(apiBase() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await tenantAccessToken();
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as LarkEnvelope<T>;
    const code = body.code ?? (res.ok ? 0 : -1);
    if (attempt === 0 && (res.status === 401 || TOKEN_ERROR_CODES.has(code))) {
      clearTokenCache();
      continue;
    }
    if (!res.ok || code !== 0) throw new LarkApiError(path, res.status, code, body.msg ?? '');
    return (body.data ?? {}) as T;
  }
  throw new LarkApiError(path, 401, -1, 'access token rejected twice');
}

/** Follows page_token until has_more is false. Never assumes a single page. */
export async function larkListAll<T>(
  path: string,
  query: Record<string, string | number | undefined> = {},
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10_000; page++) {
    const data = await larkRequest<{ items?: T[]; has_more?: boolean; page_token?: string }>('GET', path, {
      query: { ...query, page_size: pageSize, page_token: pageToken },
    });
    items.push(...(data.items ?? []));
    if (!data.has_more || !data.page_token) return items;
    pageToken = data.page_token;
  }
  throw new Error(`Pagination for ${path} did not end after 10,000 pages`);
}
