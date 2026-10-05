'use client';

import { useState } from 'react';
import { useData } from '../DataProvider';
import { Bar, Icon, Pill, Seg, Who } from '../ui';
import { dayToIso, fdy, klDay, monthRange, quarterRange, weekRange } from '../../lib/dates';
import { STATUS, taskInDept, type Model, type TaskX } from '../../lib/model';

type Period = 'week' | 'month' | 'last' | '30' | 'quarter';

function bounds(M: Model, p: Period): [number, number] {
  if (p === 'week') return weekRange(M.t0);
  if (p === '30') return [M.t0 - 29, M.t0];
  if (p === 'quarter') return quarterRange(M.t0);
  if (p === 'last') return monthRange(M.t0, -1);
  return monthRange(M.t0);
}

function stats(list: TaskX[], a: number, b: number) {
  const done = list.filter((t) => {
    const c = klDay(t.completedAt);
    return t.done && Number.isFinite(c) && c >= a && c <= b;
  });
  // On time = completed on or before the deadline. Tasks with no deadline are left out of the rate.
  const withDue = done.filter((t) => Number.isFinite(t.dueDay));
  const onTime = withDue.filter((t) => klDay(t.completedAt) <= t.dueDay).length;
  return {
    done: done.length,
    rate: withDue.length ? Math.round((onTime / withDue.length) * 100) : null,
    open: list.filter((t) => !t.done).length,
    overdue: list.filter((t) => t.overdue).length,
    dueIn: list.filter((t) => t.dueDay >= a && t.dueDay <= b).length,
  };
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Reports() {
  const { M, open, toast } = useData();
  const [period, setPeriod] = useState<Period>('month');
  if (M.viewer.role === 'employee') {
    return (
      <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
        <h1 className="title">Reports are for leaders</h1>
        <p className="muted">Ask your department leader if you need a team report.</p>
      </div>
    );
  }
  const [a, b] = bounds(M, period);
  const all = stats(M.sTasks, a, b);
  const depts = M.depts.map((d) => {
    const ppl = M.sPeople.filter((p) => p.deptLabel === d);
    return { name: d, people: ppl.length, free: ppl.filter((p) => p.key === 'free').length, ...stats(M.sTasks.filter((t) => taskInDept(t, d)), a, b) };
  });
  const people = M.sPeople.map((p) => ({ p, ...stats(p.mine, a, b) })).sort((x, y) => y.done - x.done || y.open - x.open || x.p.name.localeCompare(y.p.name));
  const maxDone = Math.max(1, ...people.map((x) => x.done));
  const pct = (r: number | null) => (r == null ? '—' : `${r}%`);

  const exportCsv = () => {
    downloadCsv(`maqo-team-report-${dayToIso(a)}-to-${dayToIso(b)}.csv`, [
      ['Employee', 'Department', 'Status', 'Open tasks', 'Overdue', 'Completed in period', 'On-time rate'],
      ...people.map((x) => [x.p.name, x.p.deptLabel, STATUS[x.p.key].label, x.open, x.overdue, x.done, x.rate == null ? '' : `${x.rate}%`]),
    ]);
    toast('Report downloaded');
  };

  return (
    <>
      <div className="topbar">
        <div><h1 className="title">Reports</h1><p className="muted">{fdy(a)} to {fdy(b)}</p></div>
        <div className="row">
          <Seg<Period> label="Period" value={period} onChange={setPeriod} options={[['week', 'This week'], ['month', 'This month'], ['last', 'Last month'], ['30', 'Last 30 days'], ['quarter', 'This quarter']]} />
          <button type="button" className="btn" onClick={exportCsv}><Icon n="dl" s={16} />Export CSV</button>
        </div>
      </div>
      <section className="kpis k4">
        <div className="kpi big"><span>Completed in period</span><span className="v num">{all.done}</span><span className="muted">{all.dueIn} were due in this period</span></div>
        <div className="kpi"><span className="muted">On-time rate</span><span className="v num">{pct(all.rate)}</span><span className="muted">done by the deadline</span></div>
        <div className="kpi"><span className="muted">Open now</span><span className="v num">{all.open}</span><span className="muted">{M.sPeople.length ? (all.open / M.sPeople.length).toFixed(1) : '0'} per person</span></div>
        <div className="kpi"><span className="muted">Overdue now</span><span className="v num" style={{ color: 'var(--r-fg)' }}>{all.overdue}</span></div>
      </section>
      <p className="muted">Completed means Task Status is Completed, dated by Actual End Date. Tasks without an Actual End Date are not counted as completed in a period.</p>
      <section className="card">
        <h2>By department</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Department</th><th>People</th><th>Free now</th><th>Open</th><th>Completed</th><th>On time</th><th>Overdue</th></tr></thead>
            <tbody>
              {depts.map((d) => (
                <tr key={d.name}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td className="num">{d.people}</td>
                  <td className="num">{d.free}</td>
                  <td className="num">{d.open}</td>
                  <td className="num">{d.done}</td>
                  <td className="num">{pct(d.rate)}</td>
                  <td className={`num ${d.overdue ? 'c-r' : ''}`}>{d.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>By employee</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Employee</th><th style={{ minWidth: 200 }}>Completed in period</th><th>On time</th><th>Open</th><th>Overdue</th><th>Status</th></tr></thead>
            <tbody>
              {people.length ? people.map((x) => (
                <tr key={x.p.openId} className="click" onClick={() => open('emp', x.p.openId)}>
                  <td><Who p={x.p} /></td>
                  <td><span className="barrow"><Bar pct={(x.done / maxDone) * 100} tone="g" thick /><span className="num" style={{ width: 24, textAlign: 'right' }}>{x.done}</span></span></td>
                  <td className="num">{pct(x.rate)}</td>
                  <td className="num">{x.open}</td>
                  <td className={`num ${x.overdue ? 'c-r' : ''}`}>{x.overdue}</td>
                  <td><Pill tone={STATUS[x.p.key].tone}>{STATUS[x.p.key].label}</Pill></td>
                </tr>
              )) : <tr><td colSpan={6} className="empty">No employees to report on.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
