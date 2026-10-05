'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '../DataProvider';
import { DeptChips, LoadCell, NotSet, Pill, Select, Who } from '../ui';
import { people as peopleLabel, plural } from '../../lib/dates';
import { STATUS, personInDept } from '../../lib/model';
import { LEADERS } from '../../config/roles';

export default function Employees() {
  const { M, open } = useData();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState(sp.get('dept') ?? 'All');
  const [status, setStatus] = useState('all');
  const term = q.trim().toLowerCase();
  const list = M.sPeople
    .filter((p) => (dept === 'All' || personInDept(p, dept)) && (status === 'all' || p.key === status) && (!term || `${p.name} ${p.jobTitle} ${p.deptLabel}`.toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const leadsOf = (id: string) => LEADERS.find((l) => l.openId === id)?.departments ?? [];
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Employees</h1>
          <p className="muted">{peopleLabel(M.sPeople.length)} across {plural(M.depts.length, 'department')}</p>
        </div>
      </div>
      <section className="card">
        <div className="row">
          <label className="sr" htmlFor="eq">Search employees</label>
          <input id="eq" className="inp" style={{ maxWidth: 280 }} type="search" placeholder="Search name, title or department" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select id="es" label="Status" value={status} onChange={setStatus} options={[['all', 'All'], ['free', 'Free'], ['working', 'Working'], ['overloaded', 'Overloaded']]} />
        </div>
        <DeptChips value={dept} onChange={setDept} depts={M.depts} />
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Status</th><th>Open</th><th>Overdue</th><th>Next due</th><th>On leave</th><th>Leads</th><th style={{ minWidth: 140 }}>Workload</th></tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((p) => (
                  <tr key={p.openId} className="click" onClick={() => open('emp', p.openId)}>
                    <td><Who p={p} sub={p.jobTitle} /></td>
                    <td>{p.dept ?? <NotSet />}</td>
                    <td><Pill tone={STATUS[p.key].tone}>{STATUS[p.key].label}</Pill></td>
                    <td className="num">{p.n}</td>
                    <td className={`num ${p.overdueN ? 'c-r' : ''}`}>{p.overdueN}</td>
                    <td className={`num ${p.next?.dueCls ?? ''}`}>{p.next ? p.next.dueLabel : '—'}</td>
                    <td><NotSet /></td>
                    <td>{leadsOf(p.openId).join(' + ') || '—'}</td>
                    <td><LoadCell p={p} cap={M.overloadedAt} /></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="empty">{M.sPeople.length ? 'No employees match. Clear the search or pick All.' : 'No employees found. The org chart may not be shared with the app yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
