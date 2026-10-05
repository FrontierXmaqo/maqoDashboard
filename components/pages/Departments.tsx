'use client';

import Link from 'next/link';
import { useData } from '../DataProvider';
import { Avatar } from '../ui';
import { people, plural } from '../../lib/dates';
import { STATUS, personInDept, taskInDept, type StatusKey } from '../../lib/model';
import { LEADERS } from '../../config/roles';

export default function Departments() {
  const { M, open } = useData();
  const order: Record<StatusKey, number> = { overloaded: 0, working: 1, free: 2 };
  const segsDef: [StatusKey, 'g' | 'b' | 'r'][] = [['free', 'g'], ['working', 'b'], ['overloaded', 'r']];
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Departments</h1>
          <p className="muted">{plural(M.depts.length, 'department')}, who is free and what is open</p>
        </div>
      </div>
      <div className="pcards" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
        {M.depts.map((d) => {
          const members = M.people.filter((p) => personInDept(p, d)).sort((a, b) => order[a.key] - order[b.key] || a.name.localeCompare(b.name));
          const tasks = M.tasks.filter((t) => taskInDept(t, d));
          const openT = tasks.filter((t) => !t.done);
          const overdue = openT.filter((t) => t.overdue).length;
          const stalled = openT.filter((t) => t.stage === 'stalled').length;
          const leaders = LEADERS.filter((l) => (l.departments as string[]).includes(d)).map((l) => M.personById.get(l.openId)?.name ?? 'Unknown person');
          const n = (k: StatusKey) => members.filter((p) => p.key === k).length;
          const segs = segsDef.filter(([k]) => n(k));
          const tot = members.length || 1;
          const projs = M.projects.filter((p) => p.remainN > 0 && p.pt.some((t) => taskInDept(t, d)));
          const hid = 'd-' + d.replace(/[^a-z]/gi, '');
          return (
            <section key={d} className="card" aria-labelledby={hid}>
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <div>
                  <h2 id={hid}>{d}</h2>
                  <p className="muted">{leaders.length ? `Led by ${leaders.join(', ')}` : 'Leader not set'}</p>
                </div>
                <span className="num muted">{people(members.length)}</span>
              </div>
              {members.length ? (
                <>
                  <span className="segbar" style={{ flexGrow: 0 }} role="img" aria-label={segs.map(([k]) => `${n(k)} ${STATUS[k].label.toLowerCase()}`).join(', ')}>
                    {segs.map(([k, tone]) => <i key={k} className={`d-${tone}`} style={{ width: `${(n(k) / tot) * 100}%` }} />)}
                  </span>
                  <span className="legend num">
                    {segs.map(([k, tone]) => <span key={k}><span className={`dot d-${tone}`} />{n(k)} {STATUS[k].label.toLowerCase()}</span>)}
                  </span>
                </>
              ) : (
                <p className="muted">No people mapped to this department yet.</p>
              )}
              <div className="mini">
                <div><span className="muted">Open tasks</span><b className="num">{openT.length}</b></div>
                <div><span className="muted">Overdue</span><b className={`num ${overdue ? 'c-r' : ''}`}>{overdue}</b></div>
                <div><span className="muted">Stalled</span><b className={`num ${stalled ? 'c-r' : ''}`}>{stalled}</b></div>
              </div>
              {tasks.length === 0 && <p className="muted">No task data for this department in Lark yet.</p>}
              {members.length > 0 && (
                <div className="row" style={{ gap: 6 }}>
                  {members.slice(0, 24).map((p) => (
                    <button key={p.openId} type="button" className="linkish" title={`${p.name}, ${STATUS[p.key].label}`} aria-label={`${p.name}, ${STATUS[p.key].label}`} onClick={() => open('emp', p.openId)}>
                      <Avatar p={p} tone={STATUS[p.key].tone} />
                    </button>
                  ))}
                  {members.length > 24 && <span className="muted">+{members.length - 24} more</span>}
                </div>
              )}
              {projs.length > 0 && <p className="muted">Active projects: {projs.slice(0, 5).map((p) => p.name).join(', ')}{projs.length > 5 ? `, +${projs.length - 5} more` : ''}</p>}
              <div className="row" style={{ marginTop: 'auto' }}>
                <Link className="btn sm" href={`/employees?dept=${encodeURIComponent(d)}`}>People</Link>
                <Link className="btn sm" href={`/tasks?dept=${encodeURIComponent(d)}`}>Open tasks</Link>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
