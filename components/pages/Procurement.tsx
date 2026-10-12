'use client';

import { Kpi } from './SalesBits';

// shortcut: no purchase orders table yet, so the page is an empty layout; wire it to Lark when the table exists.

const COLS: [string, string][] = [['Requested', 'n'], ['Ordered', 'b'], ['Delivered', 'g']];

/** Every purchase order from request to delivery. Layout follows the Department Views prototype. */
export default function Procurement() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Procurement</h1>
          <p className="muted">Every purchase order from request to delivery. Waiting for data: fills in once the Purchase orders table in Lark is connected.</p>
        </div>
      </div>
      <div className="kpis k4">
        <Kpi big v="—" l="Orders on the way" />
        <Kpi v="—" l="Past expected delivery" />
        <Kpi v="—" l="Waiting to be ordered" />
        <Kpi v="—" l="Delivered this month" />
      </div>
      <section className="card" aria-labelledby="h-board">
        <h2 id="h-board">Order board</h2>
        <div className="board" style={{ gridTemplateColumns: 'repeat(3,minmax(220px,1fr))' }}>
          {COLS.map(([l, t]) => (
            <div key={l} className="col">
              <span className="spread"><span className="row" style={{ gap: 8 }}><span className={`dot d-${t}`} /><b>{l}</b></span><span className="muted">—</span></span>
              <p className="empty">No orders</p>
            </div>
          ))}
        </div>
      </section>
      <section className="card" aria-labelledby="h-po">
        <h2 id="h-po">Purchase orders</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>PO no.</th><th>Project</th><th>Item</th><th>Supplier</th><th>Requested</th><th>Ordered</th><th>Expected delivery</th><th>Status</th></tr></thead>
            <tbody><tr><td colSpan={8} className="empty">No purchase orders yet. They appear here once the Purchase orders table in Lark has rows.</td></tr></tbody>
          </table>
        </div>
      </section>
    </>
  );
}
