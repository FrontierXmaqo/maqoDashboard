'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData, useStored } from '../DataProvider';
import { Icon, NotSet, PrioTag, Seg, Select, TaskTable, type SortKey } from '../ui';
import { plural } from '../../lib/dates';
import { NOT_SET, PRIO, prioMeta, STAGES, taskInDept, type Model, type TaskX } from '../../lib/model';

const STATUS_OPTS: [string, string][] = [
  ['open', 'Open tasks'],
  ['all', 'All tasks'],
  ['todo', 'To do'],
  ['ongoing', 'Ongoing'],
  ['stalled', 'Stalled'],
  ['done', 'Complete'],
  ['notset', 'Status not set'],
  ['overdue', 'Overdue'],
  ['nodue', 'No deadline'],
  ['unassigned', 'No one assigned'],
];

type F = { q: string; status: string; dept: string; proj: string; emp: string; prio: string };

function passes(t: TaskX, f: F, withStatus: boolean): boolean {
  if (withStatus) {
    if (f.status === 'open' && t.done) return false;
    if (['todo', 'ongoing', 'stalled', 'done', 'notset'].includes(f.status) && t.stage !== f.status) return false;
    if (f.status === 'overdue' && !t.overdue) return false;
    if (f.status === 'nodue' && (t.done || Number.isFinite(t.dueDay))) return false;
    if (f.status === 'unassigned' && (t.done || t.assignees.length > 0)) return false;
  }
  if (f.dept !== 'All' && !taskInDept(t, f.dept)) return false;
  if (f.proj !== 'all' && !(f.proj === 'none' ? t.projectIds.length === 0 : t.projectIds.includes(f.proj))) return false;
  if (f.emp !== 'all' && !(f.emp === 'none' ? t.assignees.length === 0 : t.assignees.some((a) => a.openId === f.emp))) return false;
  if (f.prio !== 'all' && (t.priority ?? 'none') !== f.prio) return false;
  const q = f.q.trim().toLowerCase();
  if (q && !`${t.title} ${t.assigneeNames} ${t.projectNames}`.toLowerCase().includes(q)) return false;
  return true;
}

function sortTasks(list: TaskX[], s: SortKey): TaskX[] {
  return list.slice().sort((a, b) =>
    s === 'title'
      ? a.title.localeCompare(b.title)
      : s === 'emp'
        ? a.assigneeNames.localeCompare(b.assigneeNames)
        : s === 'prio'
          ? prioMeta(a.priority).rank - prioMeta(b.priority).rank || a.dd - b.dd
          : a.dd - b.dd,
  );
}

function BoardCard({ t }: { t: TaskX }) {
  const { open } = useData();
  return (
    <div className="tcard">
      <button type="button" className="linkish" onClick={() => open('task', t.id)}>
        <span className="ttl">{t.title}</span>
      </button>
      <div className="row" style={{ gap: 6 }}>
        <PrioTag p={t.priority} />
        {t.omStage && <span className="tag t-b">O&amp;M Stage</span>}
        <span className={`num ${t.dueCls}`}>{t.dueLabel}</span>
      </div>
      <div className="muted">{t.assignees.length ? t.assigneeNames : <NotSet>No one assigned</NotSet>}, {t.projectNames}</div>
    </div>
  );
}

export default function Tasks() {
  const { M, canCreate, openNew } = useData();
  const sp = useSearchParams();
  const [f, setF] = useState<F>({ q: '', status: sp.get('status') ?? 'open', dept: sp.get('dept') ?? 'All', proj: 'all', emp: sp.get('emp') ?? 'all', prio: 'all' });
  const [sort, setSort] = useState<SortKey>('due');
  const [view, setView] = useStored<'list' | 'board'>('tView', 'list');
  const set = (k: keyof F) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const list = useMemo(() => sortTasks(M.sTasks.filter((t) => passes(t, f, true)), sort), [M, f, sort]);
  const people = M.sPeople.slice().sort((a, b) => a.name.localeCompare(b.name));
  const filtered = f.q || f.status !== 'open' || f.dept !== 'All' || f.proj !== 'all' || f.emp !== 'all' || f.prio !== 'all';
  const linkedProjects = M.sProjects.filter((p) => p.pt.length).sort((a, b) => a.name.localeCompare(b.name));

  let body;
  if (view === 'board') {
    // Board columns ignore the status filter's stage choice but keep every other filter.
    const base = M.sTasks.filter((t) => passes(t, f, false));
    const showDone = f.status !== 'open';
    const cols = STAGES.filter((g) => g.k !== 'notset' || base.some((t) => t.stage === 'notset'));
    body = (
      <div className={`board${cols.length === 5 ? ' c5' : ''}`}>
        {cols.map((g) => {
          let items = base.filter((t) => t.stage === g.k);
          if (g.k === 'done' && !showDone) items = items.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 6);
          else items = sortTasks(items, 'due');
          return (
            <div key={g.k} className="col">
              <div className="spread">
                <span className="row" style={{ gap: 7, fontWeight: 600 }}><span className={`dot d-${g.tone}`} />{g.label}</span>
                <span className="num muted">{g.k === 'done' && !showDone ? `latest ${items.length}` : items.length}</span>
              </div>
              {items.length ? items.map((t) => <BoardCard key={t.id} t={t} />) : <p className="muted" style={{ padding: 6 }}>Nothing here.</p>}
            </div>
          );
        })}
      </div>
    );
  } else body = <TaskTable list={list} empty="No tasks match these filters." sort={sort} onSort={setSort} />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Tasks</h1>
          <p className="muted">{plural(view === 'board' ? M.sTasks.filter((t) => passes(t, f, false)).length : list.length, 'task')} shown</p>
        </div>
        <div className="row">
          <Seg<'list' | 'board'> label="View" value={view} onChange={setView} options={[['list', 'List'], ['board', 'Board']]} />
          {canCreate && <button type="button" className="btn primary" onClick={() => openNew(f.dept !== 'All' ? { department: f.dept } : {})}><Icon n="plus" s={16} />New task</button>}
        </div>
      </div>
      <section className="card">
        <div className="row">
          <label className="sr" htmlFor="tq">Search tasks</label>
          <input id="tq" className="inp" style={{ maxWidth: 260 }} type="search" placeholder="Search tasks" value={f.q} onChange={(e) => set('q')(e.target.value)} />
          {view === 'list' && <Select id="ts" label="Status" value={f.status} onChange={set('status')} options={STATUS_OPTS} />}
          {M.depts.length > 1 && <Select id="td" label="Department" value={f.dept} onChange={set('dept')} options={[['All', 'All departments'], ...M.depts.map((d): [string, string] => [d, d])]} />}
          <Select id="tp" label="Project" value={f.proj} onChange={set('proj')} options={[['all', 'All projects'], ['none', 'No project'], ...linkedProjects.map((p): [string, string] => [p.id, p.name])]} />
          <Select id="te" label="Assignee" value={f.emp} onChange={set('emp')} options={[['all', 'Everyone'], ['none', 'No one assigned'], ...people.map((p): [string, string] => [p.openId, p.name])]} />
          <Select id="tr" label="Priority" value={f.prio} onChange={set('prio')} options={[['all', 'Any priority'], ['high', PRIO.high.label], ['normal', PRIO.normal.label], ['none', `Priority ${NOT_SET.toLowerCase()}`]]} />
          {filtered && (
            <button type="button" className="btn sm" onClick={() => setF({ q: '', status: 'open', dept: 'All', proj: 'all', emp: 'all', prio: 'all' })}>
              Clear filters
            </button>
          )}
        </div>
        {body}
      </section>
    </>
  );
}

export type { Model };
