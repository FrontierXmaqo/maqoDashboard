'use client';

import { Avatar, Bar, Pill } from '../ui';
import { RESI_DASHBOARD_URL, RESI_LARK_URL, RESI_MONTHLY_TARGET, RESI_SALES_LARK_URL, RESI_STAGES, resiByPerson, resiOpen, resiSalesStats, type ResiProject, type ResiSale, type SalesData } from '../../lib/sales-model';
import { Kpi, LarkLink, SalesWarnings, kwp, rm, rmk } from './SalesBits';

const STATUS_TONE: Record<string, 'g' | 'b' | 'a' | 'n' | 'r'> = { COMPLETED: 'g', 'IN PROGRESS': 'b', SCHEDULE: 'b', PENDING: 'a', KIV: 'a', 'NOT STARTED': 'n' };
// Unknown stage names go last.
const order = (s: string) => (RESI_STAGES.indexOf(s) + 1 || RESI_STAGES.length + 1) - 1;
const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 0}%`;

export default function ResiSales({ data }: { data: SalesData<{ projects: ResiProject[]; sales: ResiSale[] }> }) {
  const { projects, sales } = data.rows;
  const st = resiSalesStats(sales, data.generatedAt);
  const toDate = st.fyTarget * st.fyPace;
  const maxMonth = Math.max(RESI_MONTHLY_TARGET, ...st.byMonth.map((m) => m.rm));
  const maxPerson = Math.max(1, ...st.byPerson.map((r) => r.rm));

  const rows = resiByPerson(projects);
  const statuses = new Map<string, number>();
  for (const r of projects) statuses.set(r.status ?? 'NOT SET', (statuses.get(r.status ?? 'NOT SET') ?? 0) + 1);
  const stages = new Map<string, number>();
  for (const r of projects.filter(resiOpen)) if (r.stage) stages.set(r.stage, (stages.get(r.stage) ?? 0) + 1);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Residential sales</h1>
          <p className="muted">Sales live from the Sales Declaration table, projects from PROJECT RESIDENTIAL 2026. Team target RM 1M a month.</p>
        </div>
        <div className="row">
          <LarkLink href={RESI_SALES_LARK_URL}>See all sales in Lark</LarkLink>
        </div>
      </div>
      <SalesWarnings list={data.warnings} />

      <div className="kpis k4">
        <Kpi big v={rmk(st.monthRm)} l={`This month, ${pct(st.monthRm, RESI_MONTHLY_TARGET)} of ${rmk(RESI_MONTHLY_TARGET)} (${st.monthCases} cases)`} />
        <Kpi v={rmk(st.fyRm)} l={`${st.fyLabel}, ${pct(st.fyRm, st.fyTarget)} of ${rmk(st.fyTarget)}`} />
        <Kpi v={`${st.fyCases} · ${kwp(st.fyKwp)}`} l={`Cases and kWp, ${st.fyLabel}`} />
        <Kpi v={st.fyKwp ? rm(st.fyRm / st.fyKwp) : '—'} l={`Avg RM/kWp, ${st.fyLabel}`} />
      </div>

      <section className="card" aria-labelledby="h-tgt">
        <div className="spread">
          <h2 id="h-tgt">{st.fyLabel} against target</h2>
          <span className="muted">Line = where we should be today</span>
        </div>
        <span className="barrow">
          <Bar pct={(st.fyRm / st.fyTarget) * 100} tone={st.fyRm >= toDate * 0.9 ? 'g' : 'r'} thick mark={st.fyPace * 100} />
          <span className="num" style={{ fontWeight: 600 }}>{pct(st.fyRm, st.fyTarget)}</span>
        </span>
        <span className="muted num">{rmk(st.fyRm)} of {rmk(st.fyTarget)}. By today it should be about {rmk(toDate)}.</span>
      </section>

      <section className="card" aria-labelledby="h-mo">
        <div className="spread">
          <h2 id="h-mo">Monthly sales</h2>
          <span className="muted">Line = RM 1M monthly target</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {st.byMonth.map((m) => (
            <div key={m.label} className="barrow">
              <span className="num" style={{ width: 56 }}>{m.label}</span>
              <Bar pct={(m.rm / maxMonth) * 100} tone={m.rm >= RESI_MONTHLY_TARGET ? 'g' : 'b'} thick mark={(RESI_MONTHLY_TARGET / maxMonth) * 100} />
              <span className="num" style={{ minWidth: 150, textAlign: 'right' }}>{m.rm ? `${rmk(m.rm)} · ${m.cases}` : '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="h-sp">
        <div className="spread">
          <h2 id="h-sp">Salesperson ranking, {st.fyLabel}</h2>
          <span className="muted">By selling price</span>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>#</th><th>Salesperson</th><th>Cases</th><th style={{ minWidth: 200 }}>Selling price</th><th>kWp</th><th>RM/kWp</th></tr>
            </thead>
            <tbody>
              {st.byPerson.length ? st.byPerson.map((r, i) => (
                <tr key={r.p.openId || 'none'}>
                  <td className="num">{i + 1}</td>
                  <td><span className="who"><Avatar p={r.p} sm /><b>{r.p.name}</b></span></td>
                  <td className="num">{r.cases}</td>
                  <td><span className="barrow"><Bar pct={(r.rm / maxPerson) * 100} tone="g" thick /><span className="num">{rmk(r.rm)}</span></span></td>
                  <td className="num">{r.kwp ? kwp(r.kwp) : '—'}</td>
                  <td className="num">{r.kwp ? rm(r.rm / r.kwp) : '—'}</td>
                </tr>
              )) : <tr><td colSpan={6} className="empty">No sales declared yet this financial year.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="g2b">
        <section className="card" aria-labelledby="h-pp">
          <div className="spread">
            <h2 id="h-pp">Projects per salesperson, 2026</h2>
            <LarkLink href={RESI_LARK_URL}>Projects in Lark</LarkLink>
          </div>
          <div className="tbl">
            <table>
              <thead><tr><th>Salesperson</th><th>Projects</th><th>kWp</th><th>Ongoing</th><th>Completed</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.p.openId || 'none'}>
                    <td><span className="who"><Avatar p={r.p} sm /><b>{r.p.name}</b></span></td>
                    <td className="num">{r.projects}</td>
                    <td className="num">{r.kwp.toFixed(1)}</td>
                    <td className="num">{r.ongoing}</td>
                    <td className="num">{r.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card" aria-labelledby="h-st">
          <div className="spread">
            <h2 id="h-st">Project status, 2026</h2>
            <LarkLink href={RESI_DASHBOARD_URL}>Lark dashboard</LarkLink>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {[...statuses.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <div key={s} className="spread"><Pill tone={s.startsWith('CANCEL') ? 'r' : STATUS_TONE[s] ?? 'n'}>{s}</Pill><b className="num">{n}</b></div>
            ))}
          </div>
          {stages.size > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Where ongoing projects are</h3>
              <div className="stack" style={{ gap: 6 }}>
                {[...stages.entries()].sort((a, b) => order(a[0]) - order(b[0])).map(([s, n]) => (
                  <div key={s} className="spread"><span>{order(s) < RESI_STAGES.length ? `${order(s) + 1}. ${s}` : s}</span><b className="num">{n}</b></div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
