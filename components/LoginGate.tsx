'use client';

// Signs the viewer in through the Lark JSSDK (tt.requestAccess, falling back to
// tt.requestAuthCode on older clients), as described in Lark's web app login guide.
// Outside the Lark client it asks the person to open the app in Lark.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const JSSDK = 'https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.26.js';

type TT = {
  requestAccess?: (o: { appID: string; scopeList: string[]; success: (r: { code: string }) => void; fail: (e: { errno?: number; errString?: string }) => void }) => void;
  requestAuthCode?: (o: { appId: string; success: (r: { code: string }) => void; fail: (e: { errno?: number; errString?: string }) => void }) => void;
};
declare global {
  interface Window {
    h5sdk?: { ready: (cb: () => void) => void; error: (cb: (e: unknown) => void) => void };
    tt?: TT;
  }
}

type State = { kind: 'working' } | { kind: 'outside' } | { kind: 'error'; msg: string };

function getCode(appId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tt = window.tt;
    const viaAuthCode = () =>
      tt?.requestAuthCode
        ? tt.requestAuthCode({ appId, success: (r) => resolve(r.code), fail: (e) => reject(new Error(e.errString || `Lark error ${e.errno ?? ''}`)) })
        : reject(new Error('This Lark version cannot sign in to web apps. Update Lark and try again.'));
    if (tt?.requestAccess) {
      tt.requestAccess({
        appID: appId,
        scopeList: [],
        success: (r) => resolve(r.code),
        fail: (e) => (e.errno === 103 ? viaAuthCode() : reject(new Error(e.errString || `Lark error ${e.errno ?? ''}`))),
      });
    } else viaAuthCode();
  });
}

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.h5sdk) return resolve();
    const s = document.createElement('script');
    s.src = JSSDK;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the Lark SDK. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}

export function LoginGate({ appId, devLogin }: { appId: string | null; devLogin: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'working' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fail = (msg: string) => !cancelled && setState({ kind: 'error', msg });
    (async () => {
      setState({ kind: 'working' });
      if (!/Lark|Feishu/i.test(navigator.userAgent)) return !cancelled && setState({ kind: 'outside' });
      if (!appId) return fail('Sign-in is not configured on this deployment (LARK_APP_ID is missing).');
      try {
        await loadSdk();
        if (!window.h5sdk) return !cancelled && setState({ kind: 'outside' });
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Lark did not respond. Close and reopen the app.')), 10_000);
          window.h5sdk!.error((e) => console.error('h5sdk error', e));
          window.h5sdk!.ready(() => {
            clearTimeout(t);
            resolve();
          });
        });
        const code = await getCode(appId);
        const res = await fetch('/api/auth/lark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) return fail(body.error || 'Sign-in failed.');
        if (!cancelled) router.refresh();
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Sign-in failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appId, attempt, router]);

  return (
    <main className="main" style={{ maxWidth: 560, margin: '64px auto' }}>
      <div className="card" style={{ alignItems: 'flex-start', padding: 28, gap: 14 }}>
        <div className="brand" style={{ padding: 0 }}>
          <div className="logo">M</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>MAQO</div>
            <div className="muted">Command Center</div>
          </div>
        </div>
        {state.kind === 'working' && (
          <>
            <h1 className="title">Signing you in…</h1>
            <p className="muted">Checking your Lark account.</p>
            <div className="skel" style={{ width: '60%' }} />
          </>
        )}
        {state.kind === 'outside' && (
          <>
            <h1 className="title">Please open this in Lark</h1>
            <p className="muted">The Command Center signs you in with your Lark account. Open it from Lark: Workplace, then Maqo Command Center.</p>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <h1 className="title">Couldn’t sign you in</h1>
            <p className="muted">{state.msg}</p>
            <button type="button" className="btn primary" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          </>
        )}
        {devLogin && <a href="/dev-login" className="btn sm">Dev sign-in (mock roles)</a>}
      </div>
    </main>
  );
}
