'use client';

import { useData } from '../DataProvider';
import { Legend, Pill, SegBar, TaskTable } from '../ui';
import { weekRange } from '../../lib/dates';
import { STATUS, taskInDept } from '../../lib/model';

export default function MyWork() {
  const { M, open, me: who } = useData();
  const me = M.personById.get(who.openId);
  if (!me) {
    return (
      <>
        <div className="topbar"><div><h1 className="title">My work</h1><p className="muted">{who.name}</p></div></div>
        <div className="card"><p className="muted">You have no tasks assigned in Lark yet, and you were not found in the org chart. Department: not set.</p></div>
      </>
    );
  }
  const [wa, wb] = weekRange(M.t0);
  const mine = me.open.slice().sort((a, b) => a.dd - b.dd);
  const team = me.dept ? M.sTasks.filter((t) => !t.done && taskInDept(t, me.dept!) && !t.assignees.some((a) => a.openId === me.openId)).sort((a, b) => a.dd - b.dd).slice(0, 8) : [];
  const projects = M.projects.filter((p) => p.pt.some((t) => t.assignees.some((a) => a.openId === me.openId)));
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">My work</h1>
          <p className="muted">{me.name}, {me.deptLabel}</p>
        </div>
      </div>
      <section className="kpis k4">
        <div className="kpi big"><span>My open tasks</span><span className="v num">{me.n}</span><span className="muted">{STATUS[me.key].label}</span></div>
        <div className="kpi"><span className="muted">Due this week</span><span className="v num">{me.open.filter((t) => t.dueDay >= wa && t.dueDay <= wb).length}</span></div>
        <div className="kpi"><span className="muted">Overdue</span><span className="v num" style={{ color: 'var(--r-fg)' }}>{me.overdueN}</span></div>
        <div className="kpi"><span className="muted">Stalled</span><span className="v num">{me.open.filter((t) => t.stage === 'stalled').length}</span></div>
      </section>
      <section className="card"><h2>My tasks</h2><TaskTable list={mine} empty="No open tasks. Ask your leader for the next one." /></section>
      <div className="g2b">
        <section className="card"><h2>Team tasks in {me.deptLabel}</h2><TaskTable list={team} empty={me.dept ? 'Your team has no other open tasks.' : 'Department not set, so team tasks cannot be shown.'} /></section>
        <section className="card">
          <h2>My projects</h2>
          {projects.length ? (
            projects.map((p) => (
              <button key={p.id} type="button" className="list-btn" style={{ flexDirection: 'column', gap: 6 }} onClick={() => open('proj', p.id)}>
                <span className="spread" style={{ width: '100%' }}><b style={{ fontWeight: 600 }}>{p.name}</b>{p.cycleStatus && <Pill tone="n">{p.cycleStatus}</Pill>}</span>
                <span className="barrow" style={{ width: '100%' }}><SegBar p={p} /><span className="num">{p.doneN}/{p.pt.length}</span></span>
                <Legend p={p} />
              </button>
            ))
          ) : (
            <p className="empty">Not on any project yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
