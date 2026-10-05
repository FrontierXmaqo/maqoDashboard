// Exchanges a JSSDK auth code for the signed-in Lark user. Server-only.
// Endpoints checked against open.larksuite.com/document ("Lark client web app access guide"):
//   POST /authen/v2/oauth/token { grant_type: "authorization_code", client_id, client_secret, code }
//     -> { code: 0, access_token, expires_in, ... }   (no redirect_uri for in-client codes)
//   GET  /authen/v1/user_info  (Authorization: Bearer user_access_token)
//     -> { code: 0, data: { open_id, name, en_name, avatar_thumb, ... } }

import { apiBase, LarkApiError } from '../lark/client.ts';
import { larkEnv } from '../lark/env.ts';

export type LarkIdentity = { openId: string; name: string; avatarUrl: string | null };

export async function identityFromCode(code: string): Promise<LarkIdentity> {
  const { appId, appSecret } = larkEnv();
  const tokenPath = '/authen/v2/oauth/token';
  const tokRes = await fetch(apiBase() + tokenPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: appId, client_secret: appSecret, code }),
    cache: 'no-store',
  });
  const tok = (await tokRes.json().catch(() => ({}))) as { code?: number | string; access_token?: string; error_description?: string; msg?: string };
  if (Number(tok.code ?? -1) !== 0 || !tok.access_token) {
    throw new LarkApiError(tokenPath, tokRes.status, Number(tok.code ?? -1), tok.error_description || tok.msg || '');
  }

  const infoPath = '/authen/v1/user_info';
  const infoRes = await fetch(apiBase() + infoPath, { headers: { Authorization: `Bearer ${tok.access_token}` }, cache: 'no-store' });
  const info = (await infoRes.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    data?: { open_id?: string; name?: string; en_name?: string; avatar_thumb?: string };
  };
  if (info.code !== 0 || !info.data?.open_id) throw new LarkApiError(infoPath, infoRes.status, info.code ?? -1, info.msg ?? '');
  const d = info.data;
  return { openId: d.open_id!, name: d.en_name || d.name || 'Not set', avatarUrl: d.avatar_thumb || null };
}
