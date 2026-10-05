'use client';

import { useState } from 'react';
import { useData } from '../DataProvider';
import { Avatar, EmptyCard, Legend, Pill, SegBar, projectMeta } from '../ui';
import { plural } from '../../lib/dates';
import type { ProjectX } from '../../lib/model';

const FILTERS: [string, string, (p: ProjectX) => boolean][] = [
  ['open', 'Has open tasks', (p) => p.remainN > 0],
  ['done', 'All tasks complete', (p) => p.pt.length > 0 && p.remainN === 0],
  ['none', 'No tasks', (p) => p.pt.length === 0],
  ['all', 'All', () => true],
];

export default function Projects() {
  const { M, open } = useData();
  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const def = FILTERS.find((x) => x[0] === filter) ?? FILTERS[0];
  const term = q.trim().toLowerCase();
  const ps = M.sProjects
    .filter(def[2])
    .filter((p) => !term || `${p.name} ${p.type} ${p.state} ${p.cycleStatus}`.toLowerCase().includes(term))
    .sort((a, b) => b.overdueN - a.overdueN || b.remainN - a.remainN || a.name.localeCompare(b.name));
  const shown = ps.slice(0, 120);
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Projects</h1>
          <p className="muted">{plural(M.sProjects.length, 'project')} in the O&amp;M handover table</p>
        </div>
        <label className="sr" htmlFor="pq">Search projects</label>
        <input id="pq" className="inp" style={{ maxWidth: 280 }} type="search" placeholder="Search name, type, state" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips" role="group" aria-label="Project filter">
        {FILTERS.map(([k, l, fn]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l} <span className="num" style={{ opacity: 0.7 }}>{M.sProjects.filter(fn).length}</span>
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="pcards">
          {shown.map((p) => {
            const team = Array.from(new Map(p.pt.flatMap((t) => t.assignees).map((u) => [u.openId, u])).values());
            return (
              <button key={p.id} type="button" className="pcard" onClick={() => open('proj', p.id)}>
                <span className="spread" style={{ width: '100%' }}>
                  <b style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</b>
                  {p.cycleStatus ? <Pill tone="n">{p.cycleStatus}</Pill> : <span className="ns">Cycle status not set</span>}
                </span>
                <span className="muted">{projectMeta(p)}</span>
                {p.pt.length ? (
                  <>
                    <span className="barrow"><SegBar p={p} /><span className="num" style={{ fontWeight: 600 }}>{p.doneN}/{p.pt.length}</span></span>
                    <span className="spread" style={{ width: '100%' }}>
                      <Legend p={p} />
                      {p.overdueN > 0 && <span className="num c-r">{p.overdueN} overdue</span>}
                    </span>
                  </>
                ) : (
                  <span className="muted">No tasks linked yet.</span>
                )}
                {team.length > 0 && (
                  <span className="row" style={{ gap: 0, paddingLeft: 6 }}>
                    {team.slice(0, 6).map((u) => <span key={u.openId} style={{ marginLeft: -6 }}><Avatar p={u} sm /></span>)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyCard>{M.sProjects.length ? 'No projects match.' : 'No projects found in the handover table.'}</EmptyCard>
      )}
      {ps.length > shown.length && <p className="muted">Showing the first {shown.length} of {ps.length}. Search to narrow the list.</p>}
    </>
  );
}
