'use client';

import { useState } from 'react';
import { Avatar, Bar, Pill, Seg } from '../ui';
import { CI_LARK_URL, ciByPerson, type CiCase, type CiTarget, type SalesData } from '../../lib/sales-model';
import { Kpi, LarkLink, SalesWarnings, kwp, rm, rmk } from './SalesBits';

const sumBy = (l: CiCase[], f: (c: CiCase) => number | null) => l.reduce((s, c) => s + (f(c) ?? 0), 0);

export default function CiSales({ data }: { data: SalesData<{ cases: CiCase[]; targets: CiTarget[] }> }) {
  const { cases, targets } = data.rows;
  const years = [...new Set(cases.map((c) => c.year).filter((y): y is number => y != null))].sort((a, b) => b - a);
  const [year, setYear] = useState(String(years[0] ?? new Date(data.generatedAt).getFullYear()));
  const isLatest = year === String(years[0]);
  const list = cases.filter((c) => String(c.year) === year);
  const closed = list.filter((c) => c.status === 'closed');
  const hot = list.filter((c) => c.status === 'hot');
  const warm = list.filter((c) => c.status === 'warm');
  const closedRm = sumBy(closed, (c) => c.total);
  const closedKwp = sumBy(closed, (c) => c.kwp);
  // The Target table has no year column, so targets are shown against the latest year only.
  const rows = ciByPerson(list, isLatest ? targets : []);
  const target = rows.reduce((s, r) => s + (r.target ?? 0), 0);
  const maxRm = Math.max(1, ...rows.map((r) => Math.max(r.closedRm, r.target ?? 0)));

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">C&amp;I sales</h1>
          <p className="muted">Live from the (Overall)SC and Target tables in Lark.</p>
        </div>
        <div className="row">
          {years.length > 1 && <Seg label="Year" value={year} options={years.map((y) => [String(y), String(y)] as [string, string])} onChange={setYear} />}
          <LarkLink href={CI_LARK_URL}>See all cases in Lark</LarkLink>
        </div>
      </div>
      <SalesWarnings list={data.warnings} />

      {!cases.length ? (
        <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
          <h2>No C&amp;I cases found</h2>
          <p className="muted">Nothing came back from Lark. Check the warning above, or open the Base directly.</p>
          <LarkLink href={CI_LARK_URL} primary>Open C&amp;I sales in Lark</LarkLink>
        </div>
      ) : (
        <>
          <div className="kpis k4">
            <Kpi big v={rmk(closedRm)} l={`Closed sales ${year} (${closed.length})`} />
            <Kpi v={target ? `${Math.round((closedRm / target) * 100)}%` : '—'} l={target ? `Of target (${rmk(target)})` : 'No target for this year in Lark'} />
            <Kpi v={rmk(sumBy(hot, (c) => c.total))} l={`Hot leads (${hot.length})`} />
            <Kpi v={closedKwp ? rm(closedRm / closedKwp) : '—'} l={`Avg RM/kWp closed, ${kwp(closedKwp)}`} />
          </div>

          <section className="card" aria-labelledby="h-ci">
            <div className="spread">
              <h2 id="h-ci">Salesperson performance, {year}</h2>
              <span className="muted">{isLatest ? 'Line in the bar = target' : 'Targets shown for the latest year only'}</span>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Salesperson</th><th style={{ minWidth: 220 }}>Closed (RM)</th><th>Closed kWp</th><th>RM/kWp</th><th>Hot</th><th>Warm</th><th>Cold</th><th>Lost</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.p.openId || 'none'}>
                      <td><span className="who"><Avatar p={r.p} sm /><b>{r.p.name}</b></span></td>
                      <td>
                        <span className="barrow">
                          <Bar pct={(r.closedRm / maxRm) * 100} tone={r.target && r.closedRm >= r.target ? 'g' : 'b'} thick mark={r.target ? (r.target / maxRm) * 100 : undefined} />
                          <span className="num">{rmk(r.closedRm)}</span>
                        </span>
                        {r.target ? <span className="muted num">{Math.round((r.closedRm / r.target) * 100)}% of {rmk(r.target)}</span> : null}
                      </td>
                      <td className="num">{r.closedKwp ? r.closedKwp.toFixed(1) : '—'}</td>
                      <td className="num">{r.closedKwp ? rm(r.closedRm / r.closedKwp) : '—'}</td>
                      <td className="num">{r.hotRm ? rmk(r.hotRm) : '—'}</td>
                      <td className="num">{r.warmRm ? rmk(r.warmRm) : '—'}</td>
                      <td className="num">{r.coldRm ? rmk(r.coldRm) : '—'}</td>
                      <td className="num">{r.lostN || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" aria-labelledby="h-pipe">
            <h2 id="h-pipe">Pipeline, {year}</h2>
            <div className="kpis k5">
              {([['closed', 'Closed sales', 'g'], ['hot', 'Hot lead', 'r'], ['warm', 'Warm lead', 'a'], ['cold', 'Cold lead', 'n'], ['lost', 'Lost deal', 'n']] as const).map(([k, l, t]) => {
                const g = list.filter((c) => c.status === k);
                return (
                  <div key={k} className="kpi">
                    <Pill tone={t}>{l}</Pill>
                    <span className="v num">{g.length}</span>
                    <span className="muted num">{rmk(sumBy(g, (c) => c.total))} · {kwp(sumBy(g, (c) => c.kwp))}</span>
                  </div>
                );
              })}
            </div>
            {list.some((c) => c.status === 'other') && <p className="muted">{list.filter((c) => c.status === 'other').length} cases have no client status yet.</p>}
          </section>
        </>
      )}
    </>
  );
}
