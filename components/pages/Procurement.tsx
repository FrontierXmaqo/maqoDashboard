'use client';

import { Kpi } from './SalesBits';
import { Pill } from '../ui';
import { LAST_DISPATCH, ORDERS, ORDER_TONE, TOTALS, recordUrl, type ProcurementOrder } from '../../lib/procurement';

// Data note: ORDERS is a snapshot of the Procurement Base (see lib/procurement.ts).
// The page keeps the Department Views layout: KPIs, an Order board, then the request table.

type Col = {
  label: string;
  tone: 'g' | 'b' | 'a' | 'r' | 'n';
  count: number;
  cards: ProcurementOrder[];
  more: number;
};

const underReview = ORDERS.filter((o) => o.status === 'Under Review');
const approved = ORDERS.filter((o) => o.status === 'Approved');

const COLS: Col[] = [
  { label: 'Requested', tone: 'a', count: TOTALS.underReview, cards: underReview.slice(0, 3), more: TOTALS.underReview - 3 },
  { label: 'Ordered', tone: 'b', count: TOTALS.approved, cards: approved.slice(0, 3), more: TOTALS.approved - 3 },
];

/** Every purchase order from request to delivery. */
export default function Procurement() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Procurement</h1>
          <p className="muted">Every purchase order from request to delivery. Latest requests from the Procurement Base.</p>
        </div>
      </div>

      <div className="kpis k4">
        <Kpi big v={TOTALS.approved.toLocaleString()} l="Orders on the way" />
        <Kpi v={TOTALS.pastExpected.toLocaleString()} l="Past expected delivery" />
        <Kpi v={TOTALS.underReview.toLocaleString()} l="Waiting to be ordered" />
        <Kpi v={TOTALS.deliveredThisMonth.toLocaleString()} l="Delivered this month" />
      </div>

      <section className="card" aria-labelledby="h-board">
        <h2 id="h-board">Order board</h2>
        <div className="board" style={{ gridTemplateColumns: 'repeat(3,minmax(220px,1fr))' }}>
          {COLS.map((c) => (
            <div key={c.label} className="col">
              <span className="spread">
                <span className="row" style={{ gap: 8 }}>
                  <span className={`dot d-${c.tone}`} />
                  <b>{c.label}</b>
                </span>
                <span className="muted num">{c.count.toLocaleString()}</span>
              </span>
              {c.cards.map((o) => (
                <a
                  key={o.id}
                  className="tcard"
                  href={recordUrl(o.rid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="spread" style={{ gap: 8 }}>
                    <b style={{ fontSize: 12 }}>{o.id}</b>
                    <span className="num" style={{ fontSize: 12 }}>{o.amount}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.supplier}
                  </span>
                </a>
              ))}
              {c.more > 0 && <p className="muted" style={{ fontSize: 12 }}>+{c.more.toLocaleString()} more</p>}
            </div>
          ))}

          <div className="col">
            <span className="spread">
              <span className="row" style={{ gap: 8 }}>
                <span className="dot d-g" />
                <b>Delivered</b>
              </span>
              <span className="muted num">1</span>
            </span>
            <div className="tcard">
              <span className="spread" style={{ gap: 8 }}>
                <b style={{ fontSize: 12 }}>{LAST_DISPATCH.doNumber}</b>
                <span className="muted" style={{ fontSize: 12 }}>Signed DO</span>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {LAST_DISPATCH.client} · {LAST_DISPATCH.date}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>No further dispatches recorded</p>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="h-po">
        <h2 id="h-po">Purchase orders</h2>
        <div className="tbl proc">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Project</th>
                <th>Item</th>
                <th>Supplier</th>
                <th>Requested</th>
                <th>Ordered</th>
                <th>Expected delivery</th>
                <th>Status</th>
                <th><span className="sr">Open in Lark</span></th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.id}</b></td>
                  <td>
                    <span className="pcell">
                      <b title={o.project}>{o.project}</b>
                      <span className={`cl${o.client ? '' : ' none'}`} title={o.client ?? 'No matching client in Active Projects 2026'}>
                        {o.client ?? '—'}
                      </span>
                    </span>
                  </td>
                  <td><span className="cell-item">{o.item}</span></td>
                  <td><span className="cell-sup" title={o.supplier}>{o.supplier}</span></td>
                  <td className="num">{o.requested}</td>
                  <td className="muted">{o.ordered ?? '—'}</td>
                  <td className="num">{o.expected}</td>
                  <td><Pill tone={ORDER_TONE[o.status]}>{o.status}</Pill></td>
                  <td style={{ textAlign: 'right' }}>
                    <a className="lnk-open" href={recordUrl(o.rid)} target="_blank" rel="noopener noreferrer">
                      Open details <span aria-hidden="true">↗</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Latest 12 of {TOTALS.requests} requests. Client name comes from Active Projects 2026 and only resolves where the
          project text matches — the rest show a dash.
        </p>
      </section>
    </>
  );
}
