'use client';

import { useState } from 'react';
import { useData } from '../DataProvider';
import { Icon, TaskTable } from '../ui';
import { dayToIso, fdy, isoToDay, MONL, plural } from '../../lib/dates';
import { prioMeta, type TaskX } from '../../lib/model';

const evTone = (t: TaskX) => (t.overdue ? 'r' : t.done ? 'g' : t.stage === 'stalled' ? 'a' : 'b');

export default function Calendar() {
  const { M, canCreate, openNew } = useData();
  const today = dayToIso(M.t0);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [y, m] = month.split('-').map(Number);
  const first = Math.round(Date.UTC(y, m - 1, 1) / 864e5);
  const last = Math.round(Date.UTC(y, m, 0) / 864e5);
  const start = first - ((new Date(first * 864e5).getUTCDay() + 6) % 7);
  const end = last + (6 - ((new Date(last * 864e5).getUTCDay() + 6) % 7));
  const byDay = new Map<number, TaskX[]>();
  for (const t of M.sTasks) if (Number.isFinite(t.dueDay)) byDay.set(t.dueDay, [...(byDay.get(t.dueDay) ?? []), t]);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    setMonth(ym);
    setSel(`${ym}-01`);
  };
  const cells = [];
  for (let d = start; d <= end; d++) {
    const list = (byDay.get(d) ?? []).slice().sort((a, b) => Number(a.done) - Number(b.done) || prioMeta(a.priority).rank - prioMeta(b.priority).rank);
    const s = dayToIso(d);
    const out = d < first || d > last;
    cells.push(
      <button key={d} type="button" className={`day${out ? ' out' : ''}${d === M.t0 ? ' today' : ''}`} aria-pressed={sel === s} onClick={() => setSel(s)} aria-label={`${fdy(d)}, ${plural(list.length, 'task')}`}>
        <span className="dnum num">{+s.slice(8)}</span>
        {list.slice(0, 3).map((t) => <span key={t.id} className={`ev t-${evTone(t)}`}>{t.title}</span>)}
        {list.length > 3 && <span className="muted" style={{ fontSize: 12 }}>+{list.length - 3} more</span>}
      </button>,
    );
  }
  const dayList = (byDay.get(isoToDay(sel)) ?? []).slice().sort((a, b) => prioMeta(a.priority).rank - prioMeta(b.priority).rank);
  const noDue = M.sTasks.filter((t) => !t.done && !Number.isFinite(t.dueDay)).length;
  return (
    <>
      <div className="topbar">
        <div><h1 className="title">Calendar</h1><p className="muted">Task deadlines (Estimate Deadline)</p></div>
        <div className="row">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon n="left" /></button>
          <b style={{ minWidth: 140, textAlign: 'center', fontSize: 15 }}>{MONL[m - 1]} {y}</b>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon n="right" /></button>
          <button type="button" className="btn" onClick={() => { setMonth(today.slice(0, 7)); setSel(today); }}>Today</button>
        </div>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <span className="row" style={{ gap: 6 }}><span className="dot d-b" />To do or ongoing</span>
        <span className="row" style={{ gap: 6 }}><span className="dot d-a" />Stalled</span>
        <span className="row" style={{ gap: 6 }}><span className="dot d-r" />Overdue</span>
        <span className="row" style={{ gap: 6 }}><span className="dot d-g" />Completed</span>
        {noDue > 0 && <span className="muted">{plural(noDue, 'open task')} with no deadline set are not shown.</span>}
      </div>
      <div className="cal">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="hd">{d}</div>)}
        {cells}
      </div>
      <section className="card">
        <div className="spread">
          <h2>{fdy(isoToDay(sel))}</h2>
          {canCreate && <button type="button" className="btn sm outline" onClick={() => openNew({ due: sel })}><Icon n="plus" s={14} />Task on this day</button>}
        </div>
        <TaskTable list={dayList} empty="Nothing due on this day." />
      </section>
    </>
  );
}
