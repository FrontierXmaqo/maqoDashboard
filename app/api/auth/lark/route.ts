// POST /api/auth/lark { code } -> exchanges the JSSDK code, sets the session cookie.

import { NextResponse } from 'next/server';
import { identityFromCode } from '../../../../lib/auth/lark-login';
import { SESSION_COOKIE, cookieOptions, encodeSession } from '../../../../lib/auth/session';
import { LarkApiError } from '../../../../lib/lark/client';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  if (typeof body.code !== 'string' || !body.code || body.code.length > 512) {
    return NextResponse.json({ error: 'Missing sign-in code.' }, { status: 400 });
  }
  try {
    const who = await identityFromCode(body.code);
    const res = NextResponse.json({ ok: true, name: who.name });
    res.cookies.set(SESSION_COOKIE, encodeSession(who), cookieOptions());
    return res;
  } catch (e) {
    const detail = e instanceof LarkApiError ? `Lark error ${e.code}` : e instanceof Error ? e.message : 'unknown error';
    console.error('Lark sign-in failed:', e);
    return NextResponse.json({ error: `Sign-in failed (${detail}).` }, { status: 401 });
  }
}
