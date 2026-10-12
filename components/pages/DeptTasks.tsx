'use client';

import { useData } from '../DataProvider';
import { Avatar, StagePill } from '../ui';
import { personInDept, taskInDept } from '../../lib/model';
import { Kpi } from './SalesBits';

const real = (n: string) => n !== 'No project';

/** One department: who is working on which projects and tasks. Same layout as the Department Views prototype. */
export default function DeptTasks({ dept }: { dept: string }) {
  const { M, open } = useData();
  const tasks = M.sTasks.filter((t) => taskInDept(t, dept));
  const openTasks = tasks.filter((t) => !t.done).sort((a, b) => a.projectNames.localeCompare(b.projectNames) || a.title.localeCompare(b.title));
  const projects = new Set(openTasks.map((t) => t.projectNames).filter(real));
  const people = M.sPeople.filter((p) => personInDept(p, dept)).sort((a, b) => b.open.length - a.open.length || a.name.localeCompare(b.name));
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">{dept}</h1>
          <p className="muted">Which projects and tasks each person in {dept} is working on.</p>
        </div>
      </div>
      <div className="kpis k4">
        <Kpi big v={openTasks.length} l="Tasks in progress" />
        <Kpi v={projects.size} l="Projects being worked on" />
        <Kpi v={tasks.length - openTasks.length} l="Tasks completed" />
        <Kpi v={people.length} l="People" />
      </div>
      <section className="card" aria-labelledby="h-ppl">
        <h2 id="h-ppl">Who is doing what</h2>
        <div className="pcards">
          {people.length ? (
            people.map((p) => (
              <button key={p.openId} type="button" className="pcard" onClick={() => open('emp', p.openId)}>
                <span className="who"><Avatar p={p} /><span><b>{p.name}</b><span className="muted">{p.jobTitle || dept}</span></span></span>
                {p.open.length ? (
                  <span className="stack" style={{ gap: 6, width: '100%' }}>
                    {p.open.map((t) => (
                      <span key={t.id} className="stack" style={{ gap: 2 }}>
                        <span className="spread" style={{ flexWrap: 'nowrap' }}><b style={{ fontWeight: 500 }}>{t.title}</b><StagePill t={t} /></span>
                        <span className="muted">{t.projectNames}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="muted">No task in progress</span>
                )}
              </button>
            ))
          ) : (
            <p className="empty">No one in {dept} is visible to the app yet.</p>
          )}
        </div>
      </section>
      <section className="card" aria-labelledby="h-dt">
        <h2 id="h-dt">{dept} tasks in progress, by project</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Project</th><th>Task</th><th>Assigned to</th><th>Status</th></tr></thead>
            <tbody>
              {openTasks.length ? (
                openTasks.map((t) => (
                  <tr key={t.id} className="click" onClick={() => open('task', t.id)}>
                    <td>{real(t.projectNames) ? t.projectNames : <span className="muted">No project</span>}</td>
                    <td><b style={{ fontWeight: 500 }}>{t.title}</b></td>
                    <td>{t.assigneeNames || <span className="muted">No one assigned</span>}</td>
                    <td><StagePill t={t} /></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="empty">No {dept} tasks in progress.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
