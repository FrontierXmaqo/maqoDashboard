'use client';

import { Kpi, LarkLink } from './SalesBits';

// shortcut: no data source yet, so every number is empty; wire the Ads source and the Events table when they exist.
const EVENTS_LARK_URL: string | null = null;

const Empty = ({ cols, children }: { cols: number; children: string }) => (
  <tr><td colSpan={cols} className="empty">{children}</td></tr>
);

/** Ads performance and events. Layout follows the Department Views prototype; data comes later. */
export default function Marketing() {
  const events = EVENTS_LARK_URL ? <LarkLink href={EVENTS_LARK_URL}>Open in Lark</LarkLink> : null;
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Marketing</h1>
          <p className="muted">Ads performance and events. Waiting for data: the numbers fill in once the ads source and the Events table are connected.</p>
        </div>
      </div>
      <div className="kpis k4">
        <Kpi big v="—" l="Leads this month" />
        <Kpi v="—" l="Ad spend (RM)" />
        <Kpi v="—" l="Cost per lead" />
        <Kpi v="—" l="Click-through rate" />
      </div>
      <div className="g2">
        <section className="card" aria-labelledby="h-lot">
          <div className="spread">
            <h2 id="h-lot">Leads over time</h2>
            <span className="legend"><span><span className="dot" style={{ background: 'var(--brand)' }} />Meta</span><span><span className="dot d-b" />Google</span></span>
          </div>
          <div className="muted" style={{ height: 180, border: '1px dashed var(--line)', borderRadius: 10, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '0 16px' }}>
            Chart appears once ads data is connected
          </div>
        </section>
        <section className="card" aria-labelledby="h-up">
          <div className="spread"><h2 id="h-up">Upcoming events</h2>{events}</div>
          <p className="empty">No upcoming events yet. They appear here once the Events table in Lark has rows.</p>
        </section>
      </div>
      <section className="card" aria-labelledby="h-past">
        <div className="spread"><h2 id="h-past">Past events</h2>{events}</div>
        <div className="tbl">
          <table>
            <thead><tr><th>Date</th><th>Event</th><th>Location</th><th>Owner</th><th>Target leads</th><th>Leads collected</th></tr></thead>
            <tbody><Empty cols={6}>Past events appear here with how many leads each one brought in.</Empty></tbody>
          </table>
        </div>
      </section>
      <section className="card" aria-labelledby="h-camp">
        <h2 id="h-camp">Campaigns</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Campaign</th><th>Platform</th><th>Segment</th><th>Spend</th><th>Leads</th><th>Cost per lead</th></tr></thead>
            <tbody><Empty cols={6}>No campaigns yet.</Empty></tbody>
          </table>
        </div>
        <p className="muted">Segment = which business the ad sells: Residential, C&amp;I, BESS or PPA. C&amp;I and BESS leads cost more but are worth far more per deal, so compare cost per lead within a segment.</p>
      </section>
    </>
  );
}
