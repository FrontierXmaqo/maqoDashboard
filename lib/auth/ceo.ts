// Server-only check that the request comes from the CEO view. Sales figures are CEO-only.

import { cookies } from 'next/headers';
import { CEO_ONLY_MODE } from '../../config/app.ts';
import { SESSION_COOKIE, decodeSession, devLoginEnabled } from './session.ts';
import { resolveViewer } from './viewer.ts';

export async function viewerIsCeo(): Promise<boolean> {
  if (CEO_ONLY_MODE) return true;
  try {
    const s = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
    return !!s && resolveViewer(s.openId, null, devLoginEnabled() ? s.dev : undefined).role === 'ceo';
  } catch {
    return false;
  }
}
