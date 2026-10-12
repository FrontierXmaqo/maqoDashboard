'use client';

import { useData } from '../DataProvider';
import { LoadCell, Pill, TaskTable, Who } from '../ui';
import { STATUS, personInDept, taskInDept } from '../../lib/model';
import { Kpi } from './SalesBits';

/** One department's performance: its tasks and who is free. Same layout as the Department Views prototype. */
export default function DeptTasks({ dept }: { dept: string }) {
  const { M, open } = useData();
  const tasks = M.sTasks.filter((t) => taskInDept(t, dept));
  const openTasks = tasks.filter((t) => !t.done).sort((a, b) => a.dd - b.dd);
  const overdue = openTasks.filter((t) => t.overdue).length;
  const order = { overloaded: 0, working: 1, free: 2 } as const;
  const people = M.sPeople.filter((p) => personInDept(p, dept)).sort((a, b) => order[a.key] - order[b.key] || b.n - a.n);
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">{dept}</h1>
          <p className="muted">Tasks and who is free in {dept}.</p>
        </div>
      </div>
      <div className="kpis k4">
        <Kpi big v={openTasks.length} l="Open tasks" />
        <Kpi v={<span className={overdue ? 'c-r' : ''}>{overdue}</span>} l="Overdue" />
        <Kpi v={tasks.filter((t) => t.done).length} l="Completed" />
        <Kpi v={`${people.filter((p) => p.key === 'free').length} of ${people.length}`} l="People free now" />
      </div>
      <section className="card" aria-labelledby="h-av">
        <h2 id="h-av">Team availability</h2>
        <div className="pcards">
          {people.length ? (
            people.map((p) => (
              <button key={p.openId} type="button" className="pcard" onClick={() => open('emp', p.openId)}>
                <Who p={p} sub={p.jobTitle || dept} />
                <span className="spread" style={{ width: '100%' }}>
                  <Pill tone={STATUS[p.key].tone}>{STATUS[p.key].label}</Pill>
                  <span className="num">{p.n} open{p.overdueN ? <span className="c-r">, {p.overdueN} overdue</span> : null}</span>
                </span>
                <LoadCell p={p} cap={M.overloadedAt} />
                <span className="muted">{p.cur ? `Now: ${p.cur.title}` : 'No open tasks'}</span>
              </button>
            ))
          ) : (
            <p className="empty">No one in {dept} is visible to the app yet.</p>
          )}
        </div>
      </section>
      <section className="card" aria-labelledby="h-dt">
        <h2 id="h-dt">{dept} open tasks</h2>
        <TaskTable list={openTasks} empty={`No open ${dept} tasks.`} />
      </section>
    </>
  );
}
