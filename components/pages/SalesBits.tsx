'use client';

import type { ReactNode } from 'react';

export const rm = (n: number) => 'RM ' + Math.round(n).toLocaleString('en-MY');
export const rmk = (n: number) => (n >= 1e6 ? `RM ${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `RM ${Math.round(n / 1e3)}k` : rm(n));
export const kwp = (n: number) => `${n.toLocaleString('en-MY', { maximumFractionDigits: 1 })} kWp`;

export function Kpi({ v, l, big }: { v: ReactNode; l: ReactNode; big?: boolean }) {
  return (
    <div className={`kpi${big ? ' big' : ''}`}>
      <span className="muted">{l}</span>
      <span className="v num">{v}</span>
    </div>
  );
}

export function LarkLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a className={`btn${primary ? ' primary' : ''}`} style={{ textDecoration: 'none' }} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">↗</span>
      <span className="sr"> (opens Lark in a new tab)</span>
    </a>
  );
}

export function SalesWarnings({ list }: { list: string[] }) {
  return <>{list.map((w) => <div key={w} className="banner warn" role="status">{w}</div>)}</>;
}

export function CeoOnly() {
  return (
    <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
      <h1 className="title">Sales figures are for the CEO view</h1>
      <p className="muted">Ask the CEO Office if you need these numbers.</p>
    </div>
  );
}
