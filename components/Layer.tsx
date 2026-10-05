'use client';

import type { ReactNode } from 'react';
import { useData } from './DataProvider';
import { Avatar, Icon, Legend, NotSet, PrioTag, SegBar, StagePill, Stepper, projectMeta } from './ui';
import { fd, fdy, klDay, plural } from '../lib/dates';
import { NOT_SET, STATUS, stageMeta, type TaskX } from '../lib/model';
import type { PersonRef } from '../lib/types';
import { LEADERS } from '../config/roles';

export function LayerView() {
  const { layer, close } = useData();
  if (!layer) return null;
  let inner: ReactNode = null;
  if (layer.type === 'emp') inner = <EmployeeDrawer id={layer.id} />;
  if (layer.type === 'proj') inner = <ProjectDrawer id={layer.id} />;
  if (layer.type === 'task') inner = <TaskModal id={layer.id} />;
  return (
    <div className="overlay">
      <button type="button" className="scrim" onClick={close} aria-label="Close" tabIndex={-1} />
      {inner}
    </div>
  );
}

const CloseBtn = () => {
  const { close } = useData();
  return (
    <button type="button" className="icon-btn" onClick={close} aria-label="Close" autoFocus>
      <Icon n="x" s={16} />
    </button>
  );
};

function TaskList({ list, empty, showBar }: { list: TaskX[]; empty: string; showBar?: boolean }) {
  const { open } = useData();
  if (!list.length) return <p className="muted">{empty}</p>;
  return (
    <>
      {list.map((t) => (
        <button key={t.id} type="button" className="list-btn" style={{ flexDirection: 'column', gap: 5, border: '1px solid var(--line2)', marginBottom: 6 }} onClick={() => open('task', t.id)}>
          <span className="spread" style={{ width: '100%' }}>
            <span style={{ fontWeight: 500 }}>{t.title}</span>
            <span className={`num ${t.dueCls}`}>{t.done ? fd(klDay(t.completedAt ?? t.due)) : t.dueLabel}</span>
          </span>
          <span className="muted">
            {t.projectNames}, {stageMeta(t.stage).label}
            {t.omStage ? ' (O&M Stage)' : ''}
          </span>
          {showBar && <Stepper t={t} noLabel />}
        </button>
      ))}
    </>
  );
}

function EmployeeDrawer({ id }: { id: string }) {
  const { M } = useData();
  const e = M.personById.get(id);
  if (!e) return null;
  const current = e.open.filter((t) => t.stage === 'ongoing' || t.stage === 'stalled').sort((a, b) => a.dd - b.dd);
  const upcoming = e.open.filter((t) => t.stage === 'todo' || t.stage === 'notset').sort((a, b) => a.dd - b.dd);
  const done = e.mine.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const projs = Array.from(new Set(e.mine.flatMap((t) => t.projectIds))).map((pid) => M.projectById.get(pid)?.name).filter(Boolean);
  const leads = LEADERS.find((l) => l.openId === e.openId)?.departments ?? [];
  const st = STATUS[e.key];
  return (
    <aside className="drawer" aria-label="Employee details">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="who">
          <Avatar p={e} lg tone={st.tone} />
          <span>
            <b style={{ fontSize: 15 }}>{e.name}</b>
            <span className="muted">{[e.jobTitle, e.deptLabel].filter(Boolean).join(', ')}</span>
          </span>
        </div>
        <CloseBtn />
      </div>
      <div className="mini">
        <div><span className="muted">Status</span><span style={{ fontWeight: 600, color: `var(--${st.tone}-fg)` }}>{st.label}</span></div>
        <div><span className="muted">Open tasks</span><span className="num" style={{ fontWeight: 600 }}>{e.n}</span></div>
        <div><span className="muted">Next due</span><span className={`num ${e.next?.dueCls ?? ''}`} style={{ fontWeight: 600 }}>{e.next ? e.next.dueLabel : NOT_SET}</span></div>
      </div>
      <dl className="kv">
        <dt>On leave</dt><dd><NotSet /></dd>
        <dt>Projects</dt><dd>{projs.length ? projs.join(', ') : 'None yet'}</dd>
        {leads.length > 0 && (<><dt>Leads</dt><dd>{leads.join(' + ')}</dd></>)}
        {e.source === 'tasks' && (<><dt>Org chart</dt><dd className="muted">Not found in the Lark org chart. Department taken from their tasks.</dd></>)}
      </dl>
      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Current <span className="muted num" style={{ fontWeight: 400 }}>{current.length}</span></h3>
        <TaskList list={current} empty="Nothing in progress." showBar />
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Upcoming <span className="muted num" style={{ fontWeight: 400 }}>{upcoming.length}</span></h3>
        <TaskList list={upcoming} empty="No upcoming tasks." />
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Recently completed <span className="muted num" style={{ fontWeight: 400 }}>{done.length}</span></h3>
        <TaskList list={done.slice(0, 8)} empty="No completed tasks yet." />
      </div>
    </aside>
  );
}

function ProjectDrawer({ id }: { id: string }) {
  const { M, open } = useData();
  const p = M.projectById.get(id);
  if (!p) return null;
  const order: Record<string, number> = { ongoing: 0, stalled: 1, todo: 2, notset: 3, done: 4 };
  const pt = p.pt.slice().sort((a, b) => order[a.stage] - order[b.stage] || a.dd - b.dd);
  return (
    <aside className="drawer" aria-label="Project details">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <b style={{ fontSize: 15, display: 'block' }}>{p.name}</b>
          <span className="muted">{projectMeta(p)}</span>
        </div>
        <CloseBtn />
      </div>
      <dl className="kv">
        <dt>Project type</dt><dd>{p.type || <NotSet />}</dd>
        <dt>State</dt><dd>{p.state || <NotSet />}</dd>
        <dt>Capacity</dt><dd className="num">{p.capacity ? `${p.capacity} kWp` : <NotSet />}</dd>
        <dt>O&amp;M cycle status</dt><dd>{p.cycleStatus || <NotSet />}</dd>
      </dl>
      <div className="stack" style={{ gap: 6 }}>
        <span className="barrow"><SegBar p={p} /><span className="num" style={{ fontWeight: 600 }}>{p.doneN}/{p.pt.length}</span></span>
        <Legend p={p} />
      </div>
      <div className="mini">
        <div><span className="muted">Done</span><b className="num">{p.doneN}</b></div>
        <div><span className="muted">Remaining</span><b className="num">{p.remainN}</b></div>
        <div><span className="muted">Overdue</span><b className={`num ${p.overdueN ? 'c-r' : ''}`}>{p.overdueN}</b></div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>Tasks</h3>
        {pt.length ? (
          pt.map((t) => (
            <button key={t.id} type="button" className="list-btn" style={{ border: '1px solid var(--line2)' }} onClick={() => open('task', t.id)}>
              <span className={`dot d-${stageMeta(t.stage).tone}`} style={{ marginTop: 5 }} />
              <span style={{ flexGrow: 1 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>{t.title}</span>
                <span className="muted">{t.assigneeNames}, {stageMeta(t.stage).label}</span>
              </span>
              <span className={`num ${t.dueCls}`}>{t.done ? 'Done' : t.dueLabel}</span>
            </button>
          ))
        ) : (
          <p className="muted">No tasks link to this project yet.</p>
        )}
      </div>
    </aside>
  );
}

function People({ list }: { list: PersonRef[] }) {
  const { M, open } = useData();
  if (!list.length) return <NotSet />;
  return (
    <span className="row" style={{ gap: 8 }}>
      {list.map((u) =>
        M.personById.has(u.openId) ? (
          <button key={u.openId} type="button" className="linkish row" style={{ gap: 6 }} onClick={() => open('emp', u.openId)}>
            <Avatar p={u} sm />
            <span style={{ textDecoration: 'underline' }}>{u.name}</span>
          </button>
        ) : (
          <span key={u.openId} className="row" style={{ gap: 6 }}><Avatar p={u} sm />{u.name}</span>
        ),
      )}
    </span>
  );
}

function TaskModal({ id }: { id: string }) {
  const { M } = useData();
  const t = M.tasks.find((x) => x.id === id);
  if (!t) return null;
  const projs = t.projectIds.map((pid) => M.projectById.get(pid));
  const day = (ms: number | null) => (ms == null ? <NotSet /> : fdy(klDay(ms)));
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 id="mt" style={{ fontSize: 15 }}>{t.title}</h2>
          <span className="muted">Task details</span>
        </div>
        <CloseBtn />
      </div>
      <div className="row"><StagePill t={t} />{t.overdue && <span className="tag t-r">Overdue by {plural(-t.dd, 'day')}</span>}</div>
      <dl className="kv">
        <dt>Responsible</dt><dd><People list={t.assignees} /></dd>
        <dt>Accountable</dt><dd><People list={t.accountable} /></dd>
        <dt>Support</dt><dd><People list={t.support} /></dd>
        <dt>Departments</dt><dd>{t.departments.length ? t.departments.join(', ') : <NotSet />}{t.rawDepartments.length > 0 && t.departments.length < t.rawDepartments.length && <span className="muted"> (Lark: {t.rawDepartments.join(', ')})</span>}</dd>
        <dt>Project</dt><dd>{projs.length ? projs.map((p, i) => <span key={t.projectIds[i]}>{i ? ', ' : ''}{p ? p.name : 'Linked project not found'}</span>) : <NotSet />}</dd>
        <dt>Priority</dt><dd><PrioTag p={t.priority} /></dd>
        <dt>Start date</dt><dd className="num">{day(t.start)}</dd>
        <dt>Deadline</dt><dd className={`num ${t.dueCls}`}>{day(t.due)}</dd>
        <dt>Completed</dt><dd className="num">{day(t.completedAt)}</dd>
        <dt>Task summary</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{t.summary || <NotSet />}</dd>
        <dt>Progress notes</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{t.notes || <NotSet />}</dd>
        <dt>Lark table</dt><dd className="muted">{t.sourceLabel}</dd>
      </dl>
    </div>
  );
}
