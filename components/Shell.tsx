'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';
import { useData } from './DataProvider';
import { Avatar, Icon } from './ui';
import { LayerView } from './Layer';

export const PAGES: { href: string; label: string; ic: string; roles?: string[] }[] = [
  { href: '/', label: 'Overview', ic: 'dash' },
  { href: '/my-work', label: 'My work', ic: 'me' },
  { href: '/departments', label: 'Departments', ic: 'dept' },
  { href: '/employees', label: 'Employees', ic: 'people' },
  { href: '/tasks', label: 'Tasks', ic: 'tasks' },
  { href: '/projects', label: 'Projects', ic: 'proj' },
  { href: '/calendar', label: 'Calendar', ic: 'cal' },
  { href: '/reports', label: 'Reports', ic: 'rep', roles: ['ceo', 'leader'] },
  { href: '/settings', label: 'Settings', ic: 'set' },
];

const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' });

export function Shell({ children }: { children: ReactNode }) {
  const { M, snap, toastMsg, me, dev } = useData();
  const role = M.viewer.role;
  const roleLabel = role === 'ceo' ? 'CEO, all departments' : role === 'leader' ? `Leader, ${M.viewer.depts.join(' + ')}` : `Employee${M.viewer.depts[0] ? `, ${M.viewer.depts[0]}` : ''}`;
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/dev-login';
  };
  const path = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const overdue = M.sTasks.filter((t) => t.overdue).length;

  const nav = (mobile: boolean) =>
    PAGES.filter((p) => (!p.roles || p.roles.includes(role)) && (p.href !== '/my-work' || me.openId)).map((p) => (
      <Link key={p.href} href={p.href} className="nav" aria-current={path === p.href ? 'page' : undefined}>
        <Icon n={p.ic} />
        {p.label}
        {!mobile && p.href === '/tasks' && overdue > 0 && <span className="tag t-r badge num">{overdue}</span>}
      </Link>
    ));

  return (
    <>
      <div className="layout">
        <nav className="side" aria-label="Main">
          <div className="brand">
            <div className="logo">M</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>MAQO</div>
              <div className="muted">Command Center</div>
            </div>
          </div>
          {nav(false)}
          <div style={{ flexGrow: 1 }} />
          <div className="who" style={{ padding: '12px 10px', borderTop: '1px solid var(--line)' }}>
            <Avatar p={me} />
            <span style={{ minWidth: 0 }}>
              <b>{me.name}</b>
              <span className="muted">{roleLabel}</span>
            </span>
          </div>
          {dev && (
            <button type="button" className="btn sm danger" onClick={signOut}>DEV SIGN-IN · Switch user</button>
          )}
        </nav>
        <nav className="mtop" aria-label="Main">{nav(true)}</nav>
        <main className="main">
          <div className="spread" style={{ justifyContent: 'flex-end' }}>
            {dev && <span className="tag t-r" style={{ marginRight: 'auto' }}>DEV SIGN-IN: {roleLabel}</span>}
            <span className="muted num">Updated {timeFmt.format(snap.generatedAt)}</span>
            <button type="button" className="btn sm" disabled={pending} onClick={() => start(() => router.refresh())}>
              <Icon n="refresh" s={14} />
              {pending ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {snap.warnings.map((w) => (
            <div key={w} className="banner warn" role="status">{w}</div>
          ))}
          {children}
        </main>
      </div>
      <LayerView />
      <div aria-live="polite">
        {toastMsg && (
          <div className="toast" role="status">
            <Icon n="check" s={16} />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </>
  );
}
