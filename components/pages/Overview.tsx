'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useData } from '../DataProvider';
import MyWork from './MyWork';
import { Avatar, Bar, DeptChips, Icon, StagePill, Legend, LoadCell, Pill, Seg, SegBar, Stepper, TaskTable, Who, projectMeta, NotSet } from '../ui';
import { dayToIso, fd, fdy, isoToDay, monthRange, people, plural, weekRange, weekday } from '../../lib/dates';
import { STAGES, STATUS, personInDept, taskInDept, type Model, type PersonX, type StatusKey, type Tone } from '../../lib/model';
import type { Stage } from '../../lib/types';
import { CI_LEAD_COLORS, RESI_MONTHLY_TARGET, resiStageColor, yearPace, type SalesSummary } from '../../lib/sales-model';
import { rmk, kwp } from './SalesBits';

type Att = { sev: number; tone: Tone; tag: string; title: string; meta: string; ref: ['task' | 'emp', string] };

function attention(M: Model): Att[] {
  const out: Att[] = [];
  for (const t of M.sTasks) {
    if (t.done) continue;
    const who = t.assignees.length ? t.assigneeNames : 'No one assigned';
    if (t.overdue) out.push({ sev: 5, tone: 'r', tag: 'Overdue', title: `${t.title} is overdue by ${plural(-t.dd, 'day')}`, meta: `${who}, ${t.projectNames}`, ref: ['task', t.id] });
    if (t.stage === 'stalled') out.push({ sev: 4, tone: 'r', tag: 'Stalled', title: `${t.title} is stalled`, meta: `${who}, ${t.projectNames}`, ref: ['task', t.id] });
    else if (!t.overdue && t.dd <= 1) out.push({ sev: 3, tone: 'a', tag: t.dd === 0 ? 'Today' : 'Tomorrow', title: `${t.title} is due ${t.dd === 0 ? 'today' : 'tomorrow'}`, meta: who, ref: ['task', t.id] });
  }
  for (const p of M.sPeople) {
    if (p.key === 'overloaded') out.push({ sev: 4, tone: 'r', tag: 'Workload', title: `${p.name} has ${p.n} open tasks`, meta: 'Consider moving work to someone free', ref: ['emp', p.openId] });
  }
  return out.sort((a, b) => b.sev - a.sev);
}

function AttentionCard({ M, extra = [], tasks = true }: { M: Model; extra?: SalesSummary['alerts']; tasks?: boolean }) {
  const { open } = useData();
  const router = useRouter();
  const all = useMemo(() => attention(M), [M]);
  const att = tasks ? all : [];
  return (
    <section className="card" aria-labelledby="h-att">
      <div className="spread">
        <h2 id="h-att">Needs attention</h2>
        <span className={`num ${att.length ? 'c-r' : 'muted'}`}>{plural(att.length + extra.length, 'item')}</span>
      </div>
      <div className="stack" style={{ gap: 2, maxHeight: 360, overflowY: 'auto' }}>
        {extra.map((x) => (
          <button key={x.text} type="button" className="list-btn" onClick={() => router.push(x.href)}>
            <span className="dot d-a" style={{ marginTop: 5 }} />
            <span style={{ flexGrow: 1, minWidth: 0, fontWeight: 500 }}>{x.text}</span>
            <span className="tag t-a">Sales</span>
          </button>
        ))}
        {att.length || extra.length ? (
          att.map((a, i) => (
            <button key={i} type="button" className="list-btn" onClick={() => open(a.ref[0], a.ref[1])}>
              <span className={`dot d-${a.tone}`} style={{ marginTop: 5 }} />
              <span style={{ flexGrow: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>{a.title}</span>
                <span className="muted">{a.meta}</span>
              </span>
              <span className={`tag t-${a.tone}`}>{a.tag}</span>
            </button>
          ))
        ) : (
          <p className="empty">Nothing needs you right now.</p>
        )}
      </div>
    </section>
  );
}

function FreeCard({ M }: { M: Model }) {
  const { open, canCreate, openNew } = useData();
  const canAssign = (dept: string | null) => canCreate && (M.viewer.role === 'ceo' || (dept != null && M.viewer.depts.includes(dept)));
  const free = M.sPeople.filter((p) => p.key === 'free').sort((a, b) => a.n - b.n || a.name.localeCompare(b.name));
  return (
    <section className="card" id="free" aria-labelledby="h-free">
      <div className="spread">
        <div>
          <h2 id="h-free">Free for new tasks</h2>
          <p className="muted" style={{ marginTop: 3 }}>{M.freeThreshold === 0 ? 'No open tasks right now' : `${M.freeThreshold} or fewer open tasks`}</p>
        </div>
        <span className="num muted">{people(free.length)}</span>
      </div>
      <div className="tbl" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Workload</th><th>Next due</th><th /></tr></thead>
          <tbody>
            {free.length ? (
              free.map((p) => (
                <tr key={p.openId} className="click" onClick={() => open('emp', p.openId)}>
                  <td><Who p={p} sub={p.jobTitle} /></td>
                  <td>{p.dept ?? <NotSet />}</td>
                  <td className="num">{p.n ? plural(p.n, 'open task') : 'No open tasks'}</td>
                  <td className={`num ${p.next?.dueCls ?? ''}`}>{p.next ? p.next.dueLabel : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {canAssign(p.dept) && (
                      <button type="button" className="btn sm outline" onClick={(e) => { e.stopPropagation(); openNew({ assignee: p.openId }); }}>
                        <Icon n="plus" s={14} />Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="empty">Nobody is free right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TEAM_FILTERS: [StatusKey | 'all', string, Tone | 'k'][] = [
  ['all', 'All', 'k'],
  ['free', 'Free', 'g'],
  ['working', 'Working', 'b'],
  ['overloaded', 'Overloaded', 'r'],
];

function TeamCard({ M, status, setStatus }: { M: Model; status: StatusKey | 'all'; setStatus: (s: StatusKey | 'all') => void }) {
  const { open } = useData();
  const [dept, setDept] = useState('All');
  const order: Record<StatusKey, number> = { overloaded: 0, working: 1, free: 2 };
  const list = M.sPeople
    .filter((p) => status === 'all' || p.key === status)
    .filter((p) => dept === 'All' || personInDept(p, dept))
    .sort((a, b) => order[a.key] - order[b.key] || b.n - a.n || a.name.localeCompare(b.name));
  return (
    <section className="card" id="team" aria-labelledby="h-team">
      <div className="spread">
        <h2 id="h-team">Team availability</h2>
        <div className="chips" role="group" aria-label="Status">
          {TEAM_FILTERS.map(([k, l, tone]) => (
            <button key={k} type="button" className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>
              <span className={`dot d-${tone}`} />
              {l} <span className="num" style={{ opacity: 0.7 }}>{M.sPeople.filter((p) => k === 'all' || p.key === k).length}</span>
            </button>
          ))}
        </div>
      </div>
      <DeptChips value={dept} onChange={setDept} depts={M.depts} />
      <div className="tbl">
        <table>
          <thead><tr><th>Employee</th><th>Status</th><th>Current task</th><th>Open</th><th style={{ minWidth: 150 }}>Workload</th></tr></thead>
          <tbody>
            {list.length ? (
              list.map((p) => (
                <tr key={p.openId} className="click" onClick={() => open('emp', p.openId)}>
                  <td><Who p={p} /></td>
                  <td><Pill tone={STATUS[p.key].tone}>{STATUS[p.key].label}</Pill></td>
                  <td style={{ maxWidth: 320 }}>
                    {p.cur ? (
                      <>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cur.title}</div>
                        <div style={{ marginTop: 4 }}><Stepper t={p.cur} /></div>
                      </>
                    ) : (
                      <span className="muted">No open task</span>
                    )}
                  </td>
                  <td className="num">{p.n}</td>
                  <td><LoadCell p={p} cap={M.overloadedAt} /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="empty">No one matches these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectsCard({ M }: { M: Model }) {
  const { open } = useData();
  const ps = M.sProjects
    .filter((p) => p.pt.length)
    .sort((a, b) => b.overdueN - a.overdueN || b.remainN - a.remainN)
    .slice(0, 6);
  return (
    <section className="card" aria-labelledby="h-proj">
      <div className="spread">
        <h2 id="h-proj">Project overview</h2>
        <Link className="btn sm" href="/projects">All projects</Link>
      </div>
      {ps.length ? (
        ps.map((p) => (
          <button key={p.id} type="button" className="list-btn" style={{ flexDirection: 'column', gap: 7, borderTop: '1px solid var(--line2)', borderRadius: 0, padding: '12px 4px' }} onClick={() => open('proj', p.id)}>
            <span className="spread" style={{ width: '100%' }}>
              <span>
                <b style={{ fontWeight: 600, display: 'block' }}>{p.name}</b>
                <span className="muted">{projectMeta(p)}</span>
              </span>
              {p.cycleStatus ? <Pill tone="n">{p.cycleStatus}</Pill> : <span className="ns">Cycle status not set</span>}
            </span>
            <span className="barrow" style={{ width: '100%' }}>
              <SegBar p={p} />
              <span className="num" style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.doneN}/{p.pt.length}</span>
            </span>
            <span className="spread" style={{ width: '100%' }}>
              <Legend p={p} />
              {p.overdueN > 0 && <span className="num c-r">{p.overdueN} overdue</span>}
            </span>
          </button>
        ))
      ) : (
        <p className="empty">No tasks are linked to a project yet.</p>
      )}
      <p className="muted">Green = complete, blue = ongoing, red = stalled, grey = to do. Projects with the most overdue and open tasks are listed first.</p>
    </section>
  );
}

function WorkloadCard({ M }: { M: Model }) {
  const { open } = useData();
  const [dept, setDept] = useState('All');
  const list = M.sPeople.filter((p) => dept === 'All' || personInDept(p, dept)).filter((p) => p.n > 0 || dept !== 'All').sort((a, b) => b.n - a.n);
  const max = Math.max(M.overloadedAt + 1, ...list.map((p) => p.n));
  return (
    <section className="card" aria-labelledby="h-wl">
      <h2 id="h-wl">Employee workload</h2>
      <DeptChips value={dept} onChange={setDept} depts={M.depts} />
      <div className="stack" style={{ gap: 2, maxHeight: 420, overflowY: 'auto' }}>
        {list.length ? (
          list.map((p) => (
            <button key={p.openId} type="button" className="list-btn" style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 30px', alignItems: 'center', padding: '5px 6px' }} onClick={() => open('emp', p.openId)}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span className="bar thick" style={{ height: 14, borderRadius: 4 }}>
                <i className={`d-${STATUS[p.key].tone}`} style={{ width: `${(p.n / max) * 100}%`, borderRadius: 4 }} />
                <span className="mark" style={{ left: `${(M.freeThreshold / max) * 100}%`, opacity: 0.5 }} />
              </span>
              <span className={`num ${p.key === 'overloaded' ? 'c-r' : ''}`} style={{ textAlign: 'right' }}>{p.n}</span>
            </button>
          ))
        ) : (
          <p className="empty">No open tasks assigned{dept !== 'All' ? ` in ${dept}` : ''}.</p>
        )}
      </div>
      <p className="muted">Open tasks per person (as Task Responsible). Marker = {M.freeThreshold} tasks, the free limit. {dept === 'All' ? 'People with no open tasks are hidden.' : ''}</p>
    </section>
  );
}

type Range = 'today' | 'week' | 'month' | 'custom';

function ProgressCard({ M, range, from, to }: { M: Model; range: Range; from: string; to: string }) {
  const [stage, setStage] = useState<Stage>('ongoing');
  let [a, b]: [number, number] = [M.t0, M.t0];
  if (range === 'week') [a, b] = weekRange(M.t0);
  else if (range === 'month') [a, b] = monthRange(M.t0);
  else if (range === 'custom') {
    let x = isoToDay(from);
    let y = isoToDay(to);
    if (!Number.isFinite(x)) x = M.t0;
    if (!Number.isFinite(y)) y = x;
    [a, b] = x <= y ? [x, y] : [y, x];
  }
  const inR = M.sTasks.filter((t) => (t.dueDay >= a && t.dueDay <= b) || (t.overdue && a <= M.t0 && b >= M.t0));
  const noDue = M.sTasks.filter((t) => !t.done && !Number.isFinite(t.dueDay));
  const list = inR.filter((t) => t.stage === stage).sort((x, y) => x.dd - y.dd);
  return (
    <section className="card" aria-labelledby="h-pipe">
      <div className="spread">
        <h2 id="h-pipe">Task progress</h2>
        <span className="muted">Due {a === b ? fd(a) : `${fd(a)} to ${fd(b)}`}, overdue included</span>
      </div>
      <div className="kpis k5" role="group" aria-label="Stage">
        {STAGES.map((g) => (
          <button key={g.k} type="button" className="kpi" aria-pressed={stage === g.k} onClick={() => setStage(g.k)} style={stage === g.k ? { border: '2px solid var(--text)', padding: '14px 16px' } : undefined}>
            <span className="row" style={{ gap: 7 }}><span className={`dot d-${g.tone}`} style={{ borderRadius: 2 }} />{g.label}</span>
            <span className="v num">{inR.filter((t) => t.stage === g.k).length}</span>
          </button>
        ))}
      </div>
      <TaskTable list={list} empty="No tasks in this stage for the period." />
      {noDue.length > 0 && <p className="muted">{plural(noDue.length, 'open task')} {noDue.length === 1 ? 'has' : 'have'} no deadline set and {noDue.length === 1 ? 'is' : 'are'} not counted above.</p>}
    </section>
  );
}

export default function Overview({ sales }: { sales: SalesSummary | null }) {
  const { M } = useData();
  if (M.viewer.role === 'employee') return <MyWork />;
  if (M.viewer.role === 'ceo' && sales) return <CeoOverview sales={sales} />;
  return <TeamOverview />;
}

/** Task progress colours, the same set the Calendar uses. */
const TASK_COLORS: Record<Stage, string> = { todo: '#4E7FE0', ongoing: '#8A5CD6', stalled: '#E8892B', done: '#3BAA5C', notset: 'var(--n-dot)' };

/** One bar split by progress, each part its own colour, with a legend under it. */
function ProgressSplit({ parts }: { parts: [string, number, string][] }) {
  const shown = parts.filter(([, n]) => n > 0);
  if (!shown.length) return null;
  return (
    <span className="stack" style={{ gap: 6 }}>
      <span style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }} aria-hidden="true">
        {shown.map(([l, n, c]) => <span key={l} title={`${l}: ${n}`} style={{ flex: n, background: c }} />)}
      </span>
      <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '3px 10px', fontSize: 12 }}>
        {shown.map(([l, n, c]) => (
          <span key={l} className="row" style={{ gap: 6, minWidth: 0 }}>
            <span className="dot" style={{ background: c }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</span>
            <b className="num" style={{ marginLeft: 'auto' }}>{n}</b>
          </span>
        ))}
      </span>
    </span>
  );
}

function DeptCard({ href, title, big, bigL, subs, flag, children }: { href: string; title: string; big: string | number; bigL: string; subs: [string | number, string][]; flag?: ReactNode; children?: ReactNode }) {
  return (
    <Link className="dcard" href={href}>
      <span className="spread"><b>{title}</b>{flag}</span>
      <span><span className="big num" style={{ display: 'block' }}>{big}</span><span className="muted">{bigL}</span></span>
      <span className="sub">{subs.map(([v, l]) => <span key={l}><b className="num">{v}</b><span className="muted">{l}</span></span>)}</span>
      {children}
    </Link>
  );
}

const NOT_CONNECTED = ['Marketing, Licensing and Procurement (pages ready, waiting for data)', 'Finance', 'HR'];

type EmpRow = { id: string; p: PersonX | SalesSummary['people'][number]['p']; person?: PersonX; dept: string; sales?: SalesSummary['people'][number] };

/** Everyone the CEO can see: people from the org chart and tasks, plus salespeople from the sales tables. */
function EmployeesCard({ M, sales, limit, onShowAll }: { M: Model; sales: SalesSummary; limit?: number; onShowAll?: () => void }) {
  const { open } = useData();
  const router = useRouter();
  const [dept, setDept] = useState('All');
  const byId = new Map<string, EmpRow>(M.sPeople.map((p) => [p.openId, { id: p.openId, p, person: p, dept: p.deptLabel }]));
  for (const s of sales.people) {
    const r = byId.get(s.p.openId);
    if (r) {
      r.sales = s;
      if (!r.person?.dept) r.dept = s.dept;
    } else byId.set(s.p.openId, { id: s.p.openId, p: s.p, dept: s.dept, sales: s });
  }
  const all = [...byId.values()];
  const depts = [...new Set(all.map((r) => r.dept))].sort();
  const list = all.filter((r) => dept === 'All' || r.dept === dept).sort((a, b) => a.dept.localeCompare(b.dept) || a.p.name.localeCompare(b.p.name));
  const projectsOf = (p: PersonX) => [...new Set(p.open.map((t) => t.projectNames).filter((n) => n !== 'No project'))];
  const shown = limit ? list.slice(0, limit) : list;
  const salesLine = (s: SalesSummary['people'][number]) =>
    s.dept === 'Residential' ? `${rmk(s.closedRm)} sold (${plural(s.projects, 'case')}, ${kwp(s.kwp)}) this financial year` : `${rmk(s.closedRm)} closed (${plural(s.projects, 'deal')}), ${rmk(s.hotRm)} hot leads`;
  return (
    <section className="card" id="team" aria-labelledby="h-emp">
      <div className="spread">
        <h2 id="h-emp">Every employee</h2>
        <span className="muted num">{people(all.length)}</span>
      </div>
      <div className="chips" role="group" aria-label="Department">
        {['All', ...depts].map((d) => (
          <button key={d} type="button" className="chip sq" aria-pressed={dept === d} onClick={() => setDept(d)}>
            {d} <span className="num" style={{ opacity: 0.7 }}>{d === 'All' ? all.length : all.filter((r) => r.dept === d).length}</span>
          </button>
        ))}
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Projects</th><th>Tasks they are doing</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="click" onClick={() => (r.person ? open('emp', r.id) : router.push(r.dept === 'C&I' ? '/ci' : '/residential'))}>
                <td><span className="who"><Avatar p={r.p} sm /><b>{r.p.name}</b></span></td>
                <td>{r.dept}</td>
                <td style={{ maxWidth: 260 }}>
                  {r.sales && <div>{salesLine(r.sales)}</div>}
                  {r.person && projectsOf(r.person).map((n) => <div key={n}>{n}</div>)}
                  {!r.sales && (!r.person || !projectsOf(r.person).length) && <span className="muted">—</span>}
                </td>
                <td style={{ maxWidth: 340 }}>
                  {r.person?.open.length ? (
                    <>
                      {r.person.open.slice(0, 3).map((t) => (
                        <div key={t.id} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                          <StagePill t={t} />
                        </div>
                      ))}
                      {r.person.open.length > 3 && <div className="muted">+{r.person.open.length - 3} more</div>}
                    </>
                  ) : (
                    <span className="muted">{r.sales ? 'Sales' : 'No open task'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length < list.length && <button type="button" className="btn sm" onClick={onShowAll}>Show all {list.length}</button>}
      <p className="muted">Salespeople come from the Residential and C&amp;I sales tables. Other staff appear here once they are in the Lark org chart the app can see, or have a task.</p>
    </section>
  );
}

function TargetRow({ label, done, target, fmt, pace, href, missing }: { label: string; done: number; target: number | null; fmt: (n: number) => string; pace: number; href: string; missing: string }) {
  const pct = target ? (done / target) * 100 : 0;
  const behind = target != null && done < target * pace * 0.9;
  return (
    <Link href={href} className="list-btn" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,160px) minmax(0,1fr) minmax(150px,auto)', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
      <b>{label}</b>
      {target ? (
        <span className="stack" style={{ gap: 4 }}>
          <Bar pct={pct} tone={behind ? 'r' : 'g'} thick mark={pace * 100} />
          <span className="muted num">{fmt(done)} of {fmt(target)}. By today it should be about {fmt(target * pace)}</span>
        </span>
      ) : (
        <span className="muted">{missing}</span>
      )}
      <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{target ? <>{Math.round(pct)}% {behind ? <Pill tone="r">Behind</Pill> : <Pill tone="g">On pace</Pill>}</> : fmt(done)}</span>
    </Link>
  );
}

/** CEO view, read top to bottom: the headline numbers, sales against target, departments, what needs attention, people. */
function CeoOverview({ sales }: { sales: SalesSummary }) {
  const { M } = useData();
  const [showAll, setShowAll] = useState(false);
  const { resi, ci } = sales;
  const pace = yearPace(sales.at);
  const taskCard = (d: string) => {
    const open = M.sTasks.filter((t) => !t.done && taskInDept(t, d));
    const projects = new Set(open.map((t) => t.projectNames).filter((n) => n !== 'No project')).size;
    return (
      <DeptCard key={d} href={d === 'O&M' ? '/om' : '/engineering'} title={d} big={open.length} bigL="tasks in progress"
        subs={[[projects, 'projects'], [M.sPeople.filter((p) => personInDept(p, d)).length, 'people']]}>
        <ProgressSplit parts={STAGES.map((st) => [st.label, M.sTasks.filter((t) => t.stage === st.k && taskInDept(t, d)).length, TASK_COLORS[st.k]])} />
      </DeptCard>
    );
  };
  const rs = resi?.sales;
  const salesRm = (ci?.closedRm ?? 0) + (rs?.fyRm ?? 0);
  const soldKwp = (resi?.kwp ?? 0) + (ci?.closedKwp ?? 0);
  const openTasks = M.sTasks.filter((t) => !t.done).length;
  const year = resi?.year ?? new Date(sales.at).getFullYear();
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">CEO overview</h1>
          <p className="muted">{weekday(M.t0)}, {fdy(M.t0)}. Live from Lark.</p>
        </div>
      </div>
      {sales.warnings.map((w) => <div key={w} className="banner warn" role="status">{w}</div>)}

      <section className="kpis k5" aria-label="Headline numbers">
        <Link className="kpi big" href="/ci" style={{ textDecoration: 'none' }}>
          <span className="muted">Sales achieved</span>
          <span className="v num">{rmk(salesRm)}</span>
          <span className="muted">C&amp;I {rmk(ci?.closedRm ?? 0)} ({plural(ci?.closedN ?? 0, 'deal')}) + Resi {rmk(rs?.fyRm ?? 0)} ({rs?.fyLabel})</span>
        </Link>
        <Link className="kpi" href="/residential" style={{ textDecoration: 'none' }}>
          <span className="muted">kWp sold {year}</span><span className="v num">{kwp(soldKwp)}</span>
          <span className="muted">Resi {kwp(resi?.kwp ?? 0)} + C&amp;I {kwp(ci?.closedKwp ?? 0)}</span>
        </Link>
        <Link className="kpi" href="/ci" style={{ textDecoration: 'none' }}>
          <span className="muted">C&amp;I hot pipeline</span><span className="v num">{rmk(ci?.hotRm ?? 0)}</span><span className="muted">{rmk(ci?.pipelineRm ?? 0)} total not yet closed</span>
        </Link>
        <Link className="kpi" href="/residential" style={{ textDecoration: 'none' }}>
          <span className="muted">Residential projects {year}</span><span className="v num">{resi?.projects ?? 0}</span><span className="muted">{resi?.ongoing ?? 0} ongoing, {resi?.completed ?? 0} completed</span>
        </Link>
        <Link className="kpi" href="/tasks" style={{ textDecoration: 'none' }}>
          <span className="muted">Tasks in progress</span><span className="v num">{openTasks}</span><span className="muted">across all departments</span>
        </Link>
      </section>

      <section className="card" aria-labelledby="h-tgt">
        <div className="spread">
          <h2 id="h-tgt">Sales against target</h2>
          <span className="muted">Line in each bar = where we should be today</span>
        </div>
        <TargetRow label={`Residential, ${rs?.fyLabel ?? ''}`} href="/residential" pace={rs?.fyPace ?? pace} done={rs?.fyRm ?? 0} target={rs?.fyTarget ?? null} fmt={rmk} missing="No Residential sales data." />
        <TargetRow label="C&I" href="/ci" pace={pace} done={ci?.closedRm ?? 0} target={ci?.target || null} fmt={rmk} missing="No targets in the C&I Target table." />
      </section>

      <div className="dgrid">
        {resi ? (
          <DeptCard href="/residential" title="Residential sales" big={rmk(resi.sales.fyRm)} bigL={`${resi.sales.fyLabel}, ${plural(resi.sales.fyCases, 'case')}, ${kwp(resi.sales.fyKwp)}`} subs={[[rmk(resi.sales.monthRm), `this month (target ${rmk(RESI_MONTHLY_TARGET)})`], [resi.ongoing, 'projects ongoing']]}>
            <ProgressSplit parts={resi.stages.map(([st, n]) => [st, n, resiStageColor(st)])} />
          </DeptCard>
        ) : (
          <div className="dcard off"><b>Residential sales</b><p className="muted">No projects came back from Lark.</p></div>
        )}
        {ci ? (
          <DeptCard href="/ci" title="C&I sales" big={rmk(ci.closedRm)} bigL={`sales achieved, ${plural(ci.closedN, 'deal')}, ${kwp(ci.closedKwp)}`}
            subs={[[ci.target ? `${Math.round((ci.closedRm / ci.target) * 100)}%` : '—', 'of target'], [rmk(ci.hotRm), 'hot leads']]}>
            <ProgressSplit parts={(sales.ciLeads ?? []).map(([st, n]) => [st, n, CI_LEAD_COLORS[st] ?? '#8A5CD6'])} />
          </DeptCard>
        ) : (
          <div className="dcard off"><b>C&amp;I sales</b><p className="muted">No cases came back from Lark.</p></div>
        )}
        {taskCard('O&M')}
        {taskCard('Engineering')}
      </div>
      <p className="muted">Not connected to Lark yet: {NOT_CONNECTED.join(', ')}.</p>

      <AttentionCard M={M} extra={sales.alerts} tasks={false} />
      <EmployeesCard M={M} sales={sales} limit={showAll ? undefined : 10} onShowAll={() => setShowAll(true)} />
    </>
  );
}

function TeamOverview() {
  const { M, canCreate, openNew } = useData();
  const [range, setRange] = useState<Range>('week');
  const [from, setFrom] = useState(dayToIso(M.t0));
  const [to, setTo] = useState(dayToIso(M.t0 + 14));
  const [teamStatus, setTeamStatus] = useState<StatusKey | 'all'>('all');
  const E = M.sPeople;
  const cnt = (k: StatusKey) => E.filter((p) => p.key === k).length;
  const overdue = M.sTasks.filter((t) => t.overdue);
  const overdueProjects = new Set(overdue.flatMap((t) => t.projectIds)).size;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">{M.viewer.role === 'ceo' ? 'Company overview' : `${M.viewer.depts.join(' + ') || 'Team'} overview`}</h1>
          <p className="muted">{weekday(M.t0)}, {fdy(M.t0)}</p>
        </div>
        <div className="row">
          <Seg<Range> label="Date range" value={range} onChange={setRange} options={[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom']]} />
          {canCreate && <button type="button" className="btn primary" onClick={() => openNew()}><Icon n="plus" s={16} />Assign task</button>}
        </div>
      </div>
      {range === 'custom' && (
        <div className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
          <label htmlFor="rf">From</label>
          <input id="rf" className="inp" style={{ width: 'auto' }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label htmlFor="rt">To</label>
          <input id="rt" className="inp" style={{ width: 'auto' }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <span className="muted">The date range changes Task progress only. Everything else shows right now.</span>
        </div>
      )}
      <section className="kpis" aria-label="Summary">
        <button type="button" className="kpi big" onClick={() => scrollTo('free')}>
          <span>Free now</span><span className="v num">{cnt('free')}</span><span className="muted">{M.freeThreshold === 0 ? 'No open tasks' : `${M.freeThreshold} or fewer open tasks`}</span>
        </button>
        <Link className="kpi" href="/employees" style={{ textDecoration: 'none' }}>
          <span className="muted">{M.viewer.role === 'ceo' ? 'Total employees' : 'Team size'}</span><span className="v num">{E.length}</span><span className="muted">On leave: not set</span>
        </Link>
        <button type="button" className="kpi" onClick={() => { setTeamStatus('working'); scrollTo('team'); }}>
          <span className="muted">Working</span><span className="v num" style={{ color: 'var(--b-fg)' }}>{cnt('working')}</span><span className="muted">{M.overloadedAt - 1 > M.freeThreshold + 1 ? `${M.freeThreshold + 1} to ${M.overloadedAt - 1}` : M.freeThreshold + 1} open tasks</span>
        </button>
        <button type="button" className="kpi" onClick={() => { setTeamStatus('overloaded'); scrollTo('team'); }}>
          <span className="muted">Overloaded</span><span className="v num" style={{ color: 'var(--r-fg)' }}>{cnt('overloaded')}</span><span className="muted">{M.overloadedAt}+ open tasks</span>
        </button>
        <Link className="kpi" href="/tasks?status=ongoing" style={{ textDecoration: 'none' }}>
          <span className="muted">Ongoing</span><span className="v num">{M.sTasks.filter((t) => t.stage === 'ongoing').length}</span><span className="muted">{M.sTasks.filter((t) => t.stage === 'stalled').length} stalled</span>
        </Link>
        <Link className="kpi" href="/tasks?status=overdue" style={{ textDecoration: 'none' }}>
          <span className="muted">Overdue</span><span className="v num" style={{ color: 'var(--r-fg)' }}>{overdue.length}</span><span className="muted">across {plural(overdueProjects, 'project')}</span>
        </Link>
      </section>
      <div className="g2">
        <AttentionCard M={M} />
        <FreeCard M={M} />
      </div>
      <TeamCard M={M} status={teamStatus} setStatus={setTeamStatus} />
      <div className="g2b">
        <ProjectsCard M={M} />
        <WorkloadCard M={M} />
      </div>
      <ProgressCard M={M} range={range} from={from} to={to} />
    </>
  );
}
