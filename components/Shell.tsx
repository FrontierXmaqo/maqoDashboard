'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { useData } from './DataProvider';
import { Avatar, Icon } from './ui';
import { LayerView } from './Layer';

export const PAGES: { href: string; label: string; ic: string; roles?: string[] }[] = [
  { href: '/', label: 'Overview', ic: 'dash' },
  { href: '/my-work', label: 'My work', ic: 'me' },
  { href: '/residential', label: 'Residential sales', ic: 'rep', roles: ['ceo'] },
  { href: '/ci', label: 'C&I sales', ic: 'rep', roles: ['ceo'] },
  { href: '/marketing', label: 'Marketing', ic: 'rep' },
  { href: '/om', label: 'O&M', ic: 'dept' },
  { href: '/engineering', label: 'Engineering', ic: 'dept' },
  { href: '/licensing', label: 'Licensing', ic: 'dept' },
  { href: '/procurement', label: 'Procurement', ic: 'dept' },
  { href: '/departments', label: 'Departments', ic: 'dept' },
  { href: '/employees', label: 'Employees', ic: 'people' },
  { href: '/calendar', label: 'Calendar', ic: 'cal' },
  { href: '/reports', label: 'Reports', ic: 'rep', roles: ['ceo', 'leader'] },
  { href: '/settings', label: 'Settings', ic: 'set' },
];

const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' });

/** Flips light and dark; the choice is remembered in this browser and applied before paint by the root layout. */
function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  const isDark = () => dark ?? (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  const flip = () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode: the choice just lasts this visit */ }
    setDark(next === 'dark');
  };
  return <button type="button" className="btn sm" onClick={flip} aria-label="Switch between dark and light mode">{dark === null ? 'Dark / Light' : dark ? 'Light mode' : 'Dark mode'}</button>;
}

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

  const nav = (mobile: boolean) =>
    PAGES.filter((p) => (!p.roles || p.roles.includes(role)) && (p.href !== '/my-work' || me.openId)).map((p) => (
      <Link key={p.href} href={p.href} className="nav" aria-current={path === p.href ? 'page' : undefined}>
        <Icon n={p.ic} />
        {p.label}
      </Link>
    ));

  return (
    <div data-page={path.split('/')[1] || 'overview'} style={{ display: 'contents' }}>
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
            <ThemeToggle />
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
    </div>
  );
}
