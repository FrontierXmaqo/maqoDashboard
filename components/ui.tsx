'use client';

import type { ReactNode } from 'react';
import { useData } from './DataProvider';
import { NOT_SET, prioMeta, stageMeta, STATUS, type PersonX, type ProjectX, type TaskX, type Tone } from '../lib/model';
import type { PersonRef, Stage, Task } from '../lib/types';

const IC: Record<string, ReactNode> = {
  dash: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.2 4-6.5 8-6.5s7 2.3 8 6.5" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.8c1.9.6 3.1 2.4 3.5 5.2" /></>,
  tasks: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="m8 12 3 3 5-6" /></>,
  dept: <><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 21v-5h6v5M9 10h.01M15 10h.01M12 10h.01" /></>,
  proj: <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  rep: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  set: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  left: <path d="m15 6-6 6 6 6" />,
  right: <path d="m9 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  dl: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  sort: <path d="M8 6v12M5 15l3 3 3-3M16 18V6M13 9l3-3 3 3" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
};

export function Icon({ n, s = 18 }: { n: keyof typeof IC | string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {IC[n]}
    </svg>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`pill t-${tone}`}>
      <span className={`dot d-${tone}`} />
      {children}
    </span>
  );
}

export const NotSet = ({ children = NOT_SET }: { children?: ReactNode }) => <span className="ns">{children}</span>;

export function StatusPill({ p }: { p: PersonX }) {
  const st = STATUS[p.key];
  return <Pill tone={st.tone}>{st.label}</Pill>;
}

export function StagePill({ t }: { t: Pick<Task, 'stage' | 'omStage' | 'statusRaw'> }) {
  const g = stageMeta(t.stage);
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <span className={`pill t-${g.tone}`}>{g.label}</span>
      {t.omStage && <span className="tag t-b">O&amp;M Stage</span>}
      {t.stage === 'notset' && t.statusRaw && <span className="tag t-n" title="Lark status the app does not recognise">{t.statusRaw}</span>}
    </span>
  );
}

/** Three-step progress: To do, Ongoing (or Stalled), Complete. Not set shows no steps. */
export function Stepper({ t, noLabel }: { t: Pick<Task, 'stage' | 'omStage' | 'statusRaw'>; noLabel?: boolean }) {
  const g = stageMeta(t.stage);
  return (
    <span className="steps" aria-label={`Stage: ${g.label}`}>
      <span className="seg3" aria-hidden="true">
        {[1, 2, 3].map((k) => (
          <i key={k} style={k <= g.step ? { background: g.tone === 'n' ? 'var(--n-dot)' : `var(--${g.tone}-dot)` } : undefined} />
        ))}
      </span>
      {noLabel ? <span className="muted">{g.label}{t.omStage ? ' (O&M Stage)' : ''}</span> : <StagePill t={t} />}
    </span>
  );
}

export function PrioTag({ p }: { p: Task['priority'] }) {
  if (!p) return <NotSet />;
  const m = prioMeta(p);
  return <span className={`tag t-${m.tone}`}>{m.label}</span>;
}

export const initials = (n: string) =>
  String(n || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function Avatar({ p, lg, sm, tone }: { p: Pick<PersonRef, 'name' | 'avatarUrl'>; lg?: boolean; sm?: boolean; tone?: Tone }) {
  return (
    <span className={`av${lg ? ' lg' : ''}${sm ? ' sm' : ''}`}>
      {p.avatarUrl ? <img src={p.avatarUrl} alt="" referrerPolicy="no-referrer" loading="lazy" /> : initials(p.name)}
      {tone && <span className={`dot d-${tone}`} />}
    </span>
  );
}

export function Who({ p, sub }: { p: PersonX; sub?: ReactNode }) {
  return (
    <span className="who">
      <Avatar p={p} tone={STATUS[p.key].tone} />
      <span>
        <b>{p.name}</b>
        <span className="muted">{sub ?? p.deptLabel}</span>
      </span>
    </span>
  );
}

export function Bar({ pct, tone, thick, mark }: { pct: number; tone: Tone | 'k'; thick?: boolean; mark?: number }) {
  return (
    <span className={`bar${thick ? ' thick' : ''}`}>
      <i className={`d-${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      {mark != null && <span className="mark" style={{ left: `${mark}%` }} />}
    </span>
  );
}

export function LoadCell({ p, cap }: { p: PersonX; cap: number }) {
  return (
    <span className="barrow">
      <Bar pct={p.loadPct} tone={STATUS[p.key].tone} />
      <span className="num" style={{ width: 62, textAlign: 'right' }}>
        {p.n} / {cap}
      </span>
    </span>
  );
}

export function SegBar({ p }: { p: ProjectX }) {
  const tot = p.pt.length || 1;
  return (
    <span className="segbar" role="img" aria-label={`${p.nsN} to do, ${p.ogN} ongoing, ${p.doneN} complete`}>
      <i className="d-g" style={{ width: `${(p.doneN / tot) * 100}%` }} />
      <i className="d-b" style={{ width: `${((p.ogN - p.stalledN) / tot) * 100}%` }} />
      <i className="d-r" style={{ width: `${(p.stalledN / tot) * 100}%` }} />
    </span>
  );
}

export function Legend({ p }: { p: ProjectX }) {
  return (
    <span className="legend num">
      <span><span className="dot d-g" />{p.doneN} complete</span>
      <span><span className="dot d-b" />{p.ogN} ongoing{p.stalledN ? ` (${p.stalledN} stalled)` : ''}</span>
      <span><span className="dot d-n" />{p.nsN} to do</span>
    </span>
  );
}

export const projectMeta = (p: ProjectX) =>
  [p.type, p.state, p.capacity ? `${p.capacity} kWp` : ''].filter(Boolean).join(' · ') || 'Type, state and capacity not set';

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function DeptChips({ value, onChange, depts }: { value: string; onChange: (v: string) => void; depts: string[] }) {
  if (depts.length < 2) return null;
  return (
    <div className="chips" role="group" aria-label="Department">
      {['All', ...depts].map((d) => (
        <button key={d} type="button" className="chip sq" aria-pressed={value === d} onClick={() => onChange(d)}>
          {d}
        </button>
      ))}
    </div>
  );
}

export function Select({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <>
      <label className="sr" htmlFor={id}>{label}</label>
      <select id={id} className="inp" style={{ width: 'auto', maxWidth: 220 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
    </>
  );
}

export type SortKey = 'title' | 'emp' | 'prio' | 'due';

export function TaskTable({ list, empty, sort, onSort }: { list: TaskX[]; empty: string; sort?: SortKey; onSort?: (k: SortKey) => void }) {
  const { open } = useData();
  const th = (k: SortKey, label: string) =>
    onSort ? (
      <th aria-sort={sort === k ? 'ascending' : undefined}>
        <button type="button" onClick={() => onSort(k)}>
          {label} <Icon n="sort" s={12} />
        </button>
      </th>
    ) : (
      <th>{label}</th>
    );
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr>
            {th('title', 'Task')}
            {th('emp', 'Assigned to')}
            {th('prio', 'Priority')}
            {th('due', 'Due')}
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {list.length ? (
            list.map((t) => (
              <tr key={t.id} className="click" onClick={() => open('task', t.id)}>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.title}</div>
                  <div className="muted">{t.projectNames}</div>
                </td>
                <td>{t.assignees.length ? t.assigneeNames : <NotSet />}</td>
                <td><PrioTag p={t.priority} /></td>
                <td className={`num ${t.dueCls}`}>{t.dueLabel}</td>
                <td><Stepper t={t} /></td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} className="empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const EmptyCard = ({ children }: { children: ReactNode }) => (
  <div className="card"><p className="muted">{children}</p></div>
);

export const stageTone = (s: Stage) => stageMeta(s).tone;
