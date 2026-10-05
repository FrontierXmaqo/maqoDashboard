// POST /api/auth/dev { openId, name, role, depts } -> mock sign-in. Dev mode only (404 otherwise).

import { NextResponse } from 'next/server';
import { DEPARTMENTS } from '../../../../config/departments';
import { SESSION_COOKIE, cookieOptions, devLoginEnabled, encodeSession } from '../../../../lib/auth/session';

export async function POST(req: Request) {
  if (!devLoginEnabled()) return new NextResponse('Not found', { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { openId?: string; name?: string; role?: string; depts?: string[] };
  const role = b.role === 'ceo' || b.role === 'leader' || b.role === 'employee' ? b.role : null;
  if (!role || !b.openId) return NextResponse.json({ error: 'Pick a role and a person.' }, { status: 400 });
  const depts = (Array.isArray(b.depts) ? b.depts : []).filter((d) => (DEPARTMENTS as readonly string[]).includes(d));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, encodeSession({ openId: b.openId, name: b.name || 'Dev user', avatarUrl: null, dev: { role, depts } }), cookieOptions());
  return res;
}
