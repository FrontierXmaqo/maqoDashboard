import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { loadSnapshot } from '../../lib/data/snapshot';
import { DataProvider } from '../../components/DataProvider';
import { Shell } from '../../components/Shell';
import { LoginGate } from '../../components/LoginGate';
import { SESSION_COOKIE, SessionConfigError, decodeSession, devLoginEnabled, type Session } from '../../lib/auth/session';
import { resolveViewer, scopeSnapshot } from '../../lib/auth/viewer';
import { CEO_ONLY_MODE } from '../../config/app';

// Data is read from Lark on each request (with a 60 s server cache), never at build time.
export const dynamic = 'force-dynamic';

export default async function DashLayout({ children }: { children: ReactNode }) {
  if (CEO_ONLY_MODE) {
    const snapshot = await loadSnapshot();
    return (
      <DataProvider snapshot={snapshot} viewer={{ role: 'ceo', openId: null, depts: [] }} me={{ openId: '', name: 'CEO Office', avatarUrl: null }} dev={false}>
        <Shell>{children}</Shell>
      </DataProvider>
    );
  }
  const dev = devLoginEnabled();
  let session: Session | null;
  try {
    session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  } catch (e) {
    if (!(e instanceof SessionConfigError)) throw e;
    return (
      <main className="main" style={{ maxWidth: 560, margin: '64px auto' }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 className="title">Sign-in is not configured</h1>
          <p className="muted">{e.message} Add it in Vercel, then redeploy.</p>
        </div>
      </main>
    );
  }
  if (!session) return <LoginGate appId={process.env.LARK_APP_ID?.trim() || null} devLogin={dev} />;

  const full = await loadSnapshot();
  const person = full.people.find((p) => p.openId === session.openId);
  const viewer = resolveViewer(session.openId, person?.dept ?? null, dev ? session.dev : undefined);
  const snapshot = scopeSnapshot(full, viewer);
  const me = { openId: session.openId, name: person?.name ?? session.name, avatarUrl: person?.avatarUrl ?? session.avatarUrl };

  return (
    <DataProvider snapshot={snapshot} viewer={viewer} me={me} dev={dev && !!session.dev}>
      <Shell>{children}</Shell>
    </DataProvider>
  );
}
