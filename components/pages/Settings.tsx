'use client';

import { useData } from '../DataProvider';
import { NotSet, Pill } from '../ui';
import { STATUS, personInDept } from '../../lib/model';
import { CEO_OPEN_IDS, LEADERS } from '../../config/roles';
import { TASK_STATUS_OPTIONS } from '../../config/schema';
import { DEPARTMENTS, LARK_DEPARTMENT_IGNORED } from '../../config/departments';

const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' });

export default function Settings() {
  const { M, snap, me } = useData();
  const T = M.freeThreshold;
  const O = M.overloadedAt;
  const nameOf = (id: string) => M.personById.get(id)?.name ?? `Unknown (${id.slice(0, 10)}…)`;
  return (
    <>
      <div className="topbar">
        <div><h1 className="title">Settings</h1><p className="muted">Read-only. Change these in the app’s config files and redeploy.</p></div>
      </div>
      <div className="g2b">
        <section className="card">
          <h2>Availability rules</h2>
          <p className="muted">Counts open tasks where the person is Task Responsible. Open = every status except Completed, including Not set. Task Support does not count.</p>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row"><Pill tone={STATUS.free.tone}>Free</Pill><span className="muted">{T === 0 ? '0' : `0 to ${T}`} open tasks</span></div>
            <div className="row"><Pill tone={STATUS.working.tone}>Working</Pill><span className="muted">{T + 1}{O - 1 > T + 1 ? ` to ${O - 1}` : ''} open tasks</span></div>
            <div className="row"><Pill tone={STATUS.overloaded.tone}>Overloaded</Pill><span className="muted">{O} or more open tasks</span></div>
            <div className="row"><Pill tone="n">On leave</Pill><span className="muted">Not set. No leave data yet, so everyone counts as available.</span></div>
          </div>
          <p className="muted">Free limit comes from FREE_THRESHOLD (default 3) in config/app.ts.</p>
        </section>
        <section className="card">
          <h2>Departments and leaders</h2>
          <div className="tbl">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Department</th><th>People</th><th>Leader</th></tr></thead>
              <tbody>
                {M.depts.map((d) => {
                  const ls = LEADERS.filter((l) => (l.departments as string[]).includes(d));
                  return (
                    <tr key={d}>
                      <td style={{ fontWeight: 600 }}>{d}</td>
                      <td className="num">{M.people.filter((p) => personInDept(p, d)).length}</td>
                      <td>{ls.length ? ls.map((l) => nameOf(l.openId)).join(', ') : <NotSet />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">CEO: {CEO_OPEN_IDS.length ? CEO_OPEN_IDS.map(nameOf).join(', ') : <NotSet />}. Roles live in config/roles.ts. A division head can lead more than one department.</p>
        </section>
      </div>
      <section className="card">
        <h2>Who can do what</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Action</th><th>CEO</th><th>Leader</th><th>Employee</th></tr></thead>
            <tbody>
              {[
                ['See departments', 'All', 'Own departments', 'Own department'],
                ['See tasks', 'All', 'Own departments', 'Own tasks and own department, read-only'],
                ['Create, assign and edit tasks', 'Any task', 'Tasks in own departments', 'No'],
              ].map((r) => (
                <tr key={r[0]}>{r.map((c, i) => (i ? <td key={i}>{c}</td> : <td key={i} style={{ fontWeight: 500 }}>{c}</td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {me.openId ? (<>
        <p>Your Lark ID: <code className="num" style={{ userSelect: 'all' }}>{me.openId}</code></p>
        <p className="muted">You are signed in as {me.name} ({M.viewer.role === 'ceo' ? 'CEO' : M.viewer.role === 'leader' ? `leader of ${M.viewer.depts.join(' + ')}` : 'employee'}). </p>
        </>) : (
          <p className="muted">CEO-only mode is on: everyone who opens this deployment sees the CEO view, with no Lark sign-in and no editing. Leader and employee views come later (CEO_ONLY_MODE in config/app.ts).</p>
        )}
      </section>
      {M.viewer.role === 'ceo' && <section className="card">
        <h2>Lark department mapping</h2>
        <p className="muted">Each Lark department name (org chart and task Department options) and the app department it maps to. Fix wrong ones in LARK_DEPARTMENT_OVERRIDES in config/departments.ts. App departments: {DEPARTMENTS.join(', ')}.</p>
        <div className="tbl">
          <table style={{ minWidth: 0 }}>
            <thead><tr><th>Lark name</th><th>App department</th></tr></thead>
            <tbody>
              {snap.departmentMap.length ? snap.departmentMap.map((d) => (
                <tr key={d.lark}><td>{d.lark}</td><td>{d.app ?? (LARK_DEPARTMENT_IGNORED.includes(d.lark) ? <span className="muted">Ignored</span> : <NotSet />)}</td></tr>
              )) : <tr><td colSpan={2} className="empty">No Lark department names found yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
      <section className="card">
        <h2>Data</h2>
        <p>Read live from Lark Base. Last read {timeFmt.format(snap.generatedAt)}. The server reuses a read for up to 60 seconds.</p>
        <div className="tbl">
          <table style={{ minWidth: 0 }}>
            <thead><tr><th>Lark table</th><th>Table ID</th><th>Rows</th></tr></thead>
            <tbody>
              {snap.sources.map((s) => (
                <tr key={s.tableId}><td>{s.label}</td><td className="muted num">{s.tableId}</td><td className="num">{s.count == null ? <span className="c-r">Could not read</span> : s.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {snap.duplicatesSkipped > 0 && <p className="muted">{snap.duplicatesSkipped} rows in a later table exactly repeat a row in an earlier one (same task, status, deadline and Task Responsible) and are counted once.</p>}
        <p className="muted num">{M.people.length} people ({M.people.filter((p) => p.source === 'contacts').length} from the org chart), {M.projects.length} projects, {M.tasks.length} tasks. Status options the app writes: {TASK_STATUS_OPTIONS.join(', ')}.</p>
      </section>
    </>
  );
}
