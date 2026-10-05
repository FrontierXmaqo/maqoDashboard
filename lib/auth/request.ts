// Resolves the signed-in viewer for an API request. Server-only.

import { cookies } from 'next/headers';
import { loadSnapshot } from '../data/snapshot.ts';
import type { Viewer } from '../model.ts';
import type { Snapshot } from '../types.ts';
import { SESSION_COOKIE, decodeSession, devLoginEnabled } from './session.ts';
import { resolveViewer } from './viewer.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Rejects cross-site POSTs. The session cookie is SameSite=Lax as well; this is a second check. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host || new URL(origin).host !== host) throw new HttpError(403, 'Request came from another site.');
}

export async function requireViewer(): Promise<{ viewer: Viewer; snap: Snapshot }> {
  const session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) throw new HttpError(401, 'You are signed out. Reopen the app in Lark.');
  const snap = await loadSnapshot();
  const person = snap.people.find((p) => p.openId === session.openId);
  const viewer = resolveViewer(session.openId, person?.dept ?? null, devLoginEnabled() ? session.dev : undefined);
  return { viewer, snap };
}
