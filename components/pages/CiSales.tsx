'use client';

import { Avatar, Bar } from '../ui';
import { CI_LARK_URL, type CiTarget, type SalesData } from '../../lib/sales-model';
import { Kpi, LarkLink, SalesWarnings, kwp, rm, rmk } from './SalesBits';

/** C&I performance per sales consultant, straight from the team's Target table in Lark. */
export default function CiSales({ data }: { data: SalesData<CiTarget[]> }) {
  const rows = data.rows.filter((t) => t.sales[0]).sort((a, b) => b.achievement - a.achievement);
  const sum = (f: (t: CiTarget) => number) => rows.reduce((s, t) => s + f(t), 0);
  const achieved = sum((t) => t.achievement);
  const target = sum((t) => t.target ?? 0);
  const closedKwp = sum((t) => t.closedKwp);
  const maxRm = Math.max(1, ...rows.map((t) => Math.max(t.achievement, t.target ?? 0)));
  const pct = (a: number, b: number) => `${a && b ? Math.max(1, Math.round((a / b) * 100)) : 0}%`;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">C&amp;I sales</h1>
          <p className="muted">Live from the C&amp;I Target table in Lark.</p>
        </div>
        <LarkLink href={CI_LARK_URL}>Open Target table in Lark</LarkLink>
      </div>
      <SalesWarnings list={data.warnings} />

      {!rows.length ? (
        <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
          <h2>No C&amp;I targets found</h2>
          <p className="muted">Nothing came back from the Target table. Check the warning above, or open the table directly.</p>
          <LarkLink href={CI_LARK_URL} primary>Open Target table in Lark</LarkLink>
        </div>
      ) : (
        <>
          <div className="kpis k4">
            <Kpi big v={rmk(achieved)} l="Sales achieved" />
            <Kpi v={pct(achieved, target)} l={`Of target (${rmk(target)})`} />
            <Kpi v={rmk(sum((t) => t.hotRm))} l="Hot lead pipeline" />
            <Kpi v={closedKwp ? rm(achieved / closedKwp) : '—'} l={`Avg RM/kWp, ${kwp(closedKwp)} closed`} />
          </div>

          <section className="card" aria-labelledby="h-ci">
            <div className="spread">
              <h2 id="h-ci">Sales consultant performance</h2>
              <span className="muted">Line in the bar = target</span>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Sales consultant</th><th style={{ minWidth: 220 }}>Sales achieved (RM)</th><th>Closed kWp</th><th>RM/kWp</th><th>Hot lead pipeline</th><th>Pipeline (not closed)</th><th>Pipeline kWp</th></tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.sales[0].openId}>
                      <td><span className="who"><Avatar p={t.sales[0]} sm /><b>{t.sales[0].name}</b></span></td>
                      <td>
                        <span className="barrow">
                          <Bar pct={(t.achievement / maxRm) * 100} tone={t.target && t.achievement >= t.target ? 'g' : 'b'} thick mark={t.target ? (t.target / maxRm) * 100 : undefined} />
                          <span className="num">{rmk(t.achievement)}</span>
                        </span>
                        {t.target ? <span className="muted num">{pct(t.achievement, t.target)} of {rmk(t.target)}</span> : null}
                      </td>
                      <td className="num">{t.closedKwp ? kwp(t.closedKwp) : '—'}</td>
                      <td className="num">{t.closedKwp ? rm(t.achievement / t.closedKwp) : '—'}</td>
                      <td className="num">{t.hotRm ? rmk(t.hotRm) : '—'}</td>
                      <td className="num">{t.pipelineRm ? rmk(t.pipelineRm) : '—'}</td>
                      <td className="num">{t.pipelineKwp ? kwp(t.pipelineKwp) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="kpis k4">
            <Kpi v={kwp(sum((t) => t.pipelineKwp))} l="Pipeline kWp" />
            <Kpi v={rmk(sum((t) => t.pipelineRm))} l="Pipeline not yet closed (RM)" />
            <Kpi v={kwp(closedKwp)} l="Closed kWp" />
            <Kpi v={rows.length} l="Sales consultants" />
          </div>
        </>
      )}
    </>
  );
}
