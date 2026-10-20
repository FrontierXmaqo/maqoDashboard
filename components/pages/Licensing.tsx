'use client';

import { Kpi } from './SalesBits';

// shortcut: no ATAP applications table yet, so the page is an empty layout; wire it to Lark when the table exists.

/** ATAP applications and where they are stuck. Layout follows the Department Views prototype. */
export default function Licensing() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Licensing</h1>
          <p className="muted">ATAP applications and where they are stuck. Waiting for data: fills in once the ATAP applications table in Lark is connected.</p>
        </div>
      </div>
      <div className="kpis k4">
        <Kpi big v="—" l="Applications in progress" />
        <Kpi v="—" l="Stuck too long" />
        <Kpi v="—" l="Approved this month" />
        <Kpi v="—" l="Avg days to approval" />
      </div>
      <section className="card" aria-labelledby="h-stage">
        <h2 id="h-stage">Where applications are</h2>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {['Submitted', 'Under review', 'Rejected, resubmit', 'Approved'].map((s) => <Kpi key={s} v="—" l={s} />)}
        </div>
      </section>
      <section className="card" aria-labelledby="h-apps">
        <h2 id="h-apps">Applications, longest stuck first</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Project</th><th>ATAP ref.</th><th>Submitted</th><th>Stage</th><th>In this stage since</th><th>Days in stage</th><th>Remarks</th></tr></thead>
            <tbody><tr><td colSpan={7} className="empty">No applications yet. They appear here once the ATAP applications table in Lark has rows.</td></tr></tbody>
          </table>
        </div>
        <p className="muted">Stuck too long = more than 21 days in Submitted or Under review, or more than 7 days waiting to resubmit after a rejection.</p>
      </section>
    </>
  );
}
