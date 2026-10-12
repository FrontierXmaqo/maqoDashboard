'use client';

import { useState } from 'react';
import { Avatar, Bar, Pill, Seg } from '../ui';
import { RESI_LARK_URL, resiByPerson, resiOpen, type ResiProject, type SalesData } from '../../lib/sales-model';
import { klDay, monthRange } from '../../lib/dates';
import { Kpi, LarkLink, SalesWarnings, kwp } from './SalesBits';

const STATUS_TONE: Record<string, 'g' | 'b' | 'a' | 'n' | 'r'> = { COMPLETED: 'g', SCHEDULE: 'b', PENDING: 'a', KIV: 'a', 'NOT STARTED': 'n' };

export default function ResiSales({ data }: { data: SalesData<ResiProject[]> }) {
  const years = [...new Set(data.rows.map((r) => r.year).filter((y): y is number => y != null))].sort((a, b) => b - a);
  const [year, setYear] = useState(String(years[0] ?? new Date(data.generatedAt).getFullYear()));
  const list = data.rows.filter((r) => String(r.year) === year);
  const live = list.filter((r) => !(r.status ?? '').startsWith('CANCEL'));
  const rows = resiByPerson(list);
  const maxKwp = Math.max(1, ...rows.map((r) => r.kwp));
  const [m0, m1] = monthRange(klDay(data.generatedAt));
  const newThisMonth = list.filter((r) => {
    const d = klDay(r.createdAt);
    return Number.isFinite(d) && d >= m0 && d <= m1;
  }).length;
  const hasCreated = list.some((r) => r.createdAt != null);

  const statuses = new Map<string, number>();
  for (const r of list) statuses.set(r.status ?? 'NOT SET', (statuses.get(r.status ?? 'NOT SET') ?? 0) + 1);
  const stages = new Map<string, number>();
  for (const r of list.filter(resiOpen)) if (r.stage) stages.set(r.stage, (stages.get(r.stage) ?? 0) + 1);

  const byYear = years
    .slice()
    .reverse()
    .map((y) => {
      const l = data.rows.filter((r) => r.year === y && !(r.status ?? '').startsWith('CANCEL'));
      return { y, n: l.length, kwp: l.reduce((s, r) => s + (r.kwp ?? 0), 0) };
    });
  const maxYear = Math.max(1, ...byYear.map((x) => x.kwp));

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Residential sales</h1>
          <p className="muted">Live from the PROJECT RESIDENTIAL tables in Lark. Selling price is not in Lark yet, so this page shows projects and kWp.</p>
        </div>
        <div className="row">
          {years.length > 1 && <Seg label="Year" value={year} options={years.map((y) => [String(y), String(y)] as [string, string])} onChange={setYear} />}
          <LarkLink href={RESI_LARK_URL}>See all sales in Lark</LarkLink>
        </div>
      </div>
      <SalesWarnings list={data.warnings} />

      {!data.rows.length ? (
        <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
          <h2>No residential projects found</h2>
          <p className="muted">Nothing came back from Lark. Check the warning above, or open the Base directly.</p>
          <LarkLink href={RESI_LARK_URL} primary>Open PROJECT RESIDENTIAL in Lark</LarkLink>
        </div>
      ) : (
        <>
          <div className="kpis k4">
            <Kpi big v={kwp(live.reduce((s, r) => s + (r.kwp ?? 0), 0))} l={`${year} kWp (${live.length} projects)`} />
            <Kpi v={list.filter(resiOpen).length} l="Ongoing projects" />
            <Kpi v={list.filter((r) => r.status === 'COMPLETED').length} l="Completed" />
            {hasCreated ? <Kpi v={newThisMonth} l="New projects this month" /> : <Kpi v={list.length - live.length} l="Cancelled by client" />}
          </div>

          <section className="card" aria-labelledby="h-sp">
            <div className="spread">
              <h2 id="h-sp">Salesperson performance, {year}</h2>
              <span className="muted">Cancelled projects are left out of kWp</span>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Salesperson</th><th>Projects</th><th style={{ minWidth: 200 }}>kWp</th><th>Ongoing</th><th>Completed</th><th>Cancelled</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.p.openId || 'none'}>
                      <td><span className="who"><Avatar p={r.p} sm /><b>{r.p.name}</b></span></td>
                      <td className="num">{r.projects}</td>
                      <td><span className="barrow"><Bar pct={(r.kwp / maxKwp) * 100} tone="g" thick /><span className="num">{r.kwp.toFixed(1)}</span></span></td>
                      <td className="num">{r.ongoing}</td>
                      <td className="num">{r.completed}</td>
                      <td className="num">{r.cancelled || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="g2b">
            <section className="card" aria-labelledby="h-yr">
              <h2 id="h-yr">kWp per year</h2>
              <div className="stack">
                {byYear.map((x) => (
                  <div key={x.y} className="barrow">
                    <span className="num" style={{ width: 44 }}>{x.y}</span>
                    <Bar pct={(x.kwp / maxYear) * 100} tone={String(x.y) === year ? 'g' : 'n'} thick />
                    <span className="num" style={{ minWidth: 150, textAlign: 'right' }}>{kwp(x.kwp)} · {x.n}</span>
                  </div>
                ))}
              </div>
              <p className="muted">2026 counts every project in the 2026 table. Earlier years count projects by installation date; projects with no installation date are not in any year.</p>
            </section>
            <section className="card" aria-labelledby="h-st">
              <h2 id="h-st">Project status, {year}</h2>
              <div className="stack" style={{ gap: 6 }}>
                {[...statuses.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                  <div key={s} className="spread"><Pill tone={s.startsWith('CANCEL') ? 'r' : STATUS_TONE[s] ?? 'n'}>{s}</Pill><b className="num">{n}</b></div>
                ))}
              </div>
              {stages.size > 0 && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Where ongoing projects are (Flow)</h3>
                  <div className="stack" style={{ gap: 6 }}>
                    {[...stages.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                      <div key={s} className="spread"><span>{s}</span><b className="num">{n}</b></div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
