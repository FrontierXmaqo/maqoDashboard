'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';
import { useData } from './DataProvider';
import { Icon } from './ui';
import { LayerView } from './Layer';

export const PAGES = [
  { href: '/', label: 'Overview', ic: 'dash' },
  { href: '/my-work', label: 'My work', ic: 'me' },
  { href: '/departments', label: 'Departments', ic: 'dept' },
  { href: '/employees', label: 'Employees', ic: 'people' },
  { href: '/tasks', label: 'Tasks', ic: 'tasks' },
  { href: '/projects', label: 'Projects', ic: 'proj' },
  { href: '/calendar', label: 'Calendar', ic: 'cal' },
  { href: '/reports', label: 'Reports', ic: 'rep' },
  { href: '/settings', label: 'Settings', ic: 'set' },
];

const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' });

export function Shell({ children }: { children: ReactNode }) {
  const { M, snap, toastMsg } = useData();
  const path = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const overdue = M.sTasks.filter((t) => t.overdue).length;

  const nav = (mobile: boolean) =>
    PAGES.map((p) => (
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
            <span className="av" style={{ background: 'var(--text)', color: 'var(--bg)' }}>KK</span>
            <span>
              <b>CEO Office</b>
              <span className="muted">All departments</span>
            </span>
          </div>
        </nav>
        <nav className="mtop" aria-label="Main">{nav(true)}</nav>
        <main className="main">
          <div className="spread" style={{ justifyContent: 'flex-end' }}>
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
