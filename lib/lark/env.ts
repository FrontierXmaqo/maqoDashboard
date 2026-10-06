// Server-only access to Lark credentials. Never import this from a client component.

if (typeof window !== 'undefined') {
  throw new Error('lib/lark is server-only and must not be bundled for the browser.');
}

export type LarkEnv = {
  appId: string;
  appSecret: string;
  baseToken: string;
};

export class LarkConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`Missing environment variables: ${missing.join(', ')}`);
    this.name = 'LarkConfigError';
    this.missing = missing;
  }
}

/**
 * Preview deployments (and local development) read the test Base when LARK_BASE_TOKEN_TEST
 * is set. Production always reads LARK_BASE_TOKEN.
 */
export function usingTestBase(): boolean {
  if (!process.env.LARK_BASE_TOKEN_TEST?.trim()) return false;
  const vercel = process.env.VERCEL_ENV;
  return vercel ? vercel === 'preview' : process.env.NODE_ENV !== 'production';
}

export function larkEnv(): LarkEnv {
  const appId = process.env.LARK_APP_ID?.trim() ?? '';
  const appSecret = process.env.LARK_APP_SECRET?.trim() ?? '';
  const test = usingTestBase();
  const baseToken = (test ? process.env.LARK_BASE_TOKEN_TEST : process.env.LARK_BASE_TOKEN)?.trim() ?? '';
  const missing = [
    !appId && 'LARK_APP_ID',
    !appSecret && 'LARK_APP_SECRET',
    !baseToken && 'LARK_BASE_TOKEN',
  ].filter((v): v is string => Boolean(v));
  if (missing.length) throw new LarkConfigError(missing);
  return { appId, appSecret, baseToken };
}
