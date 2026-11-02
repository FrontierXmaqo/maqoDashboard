'use client';

import { Kpi } from './SalesBits';
import { Pill } from '../ui';
import { orderTone, recordUrl, type ProcurementData } from '../../lib/procurement';

// Data arrives from the server (lib/data/procurement.ts), which reads the Procurement Base
// and falls back to a labelled snapshot if the read fails. Layout follows Department Views.

export default function Procurement({ data }: { data: ProcurementData }) {
  const { totals, board, orders } = data;

  const cols = [
    { label: 'Requested', tone: 'a' as const, count: totals.underReview, cards: board.requested },
    { label: 'Ordered', tone: 'b' as const, count: totals.approved, cards: board.ordered },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Procurement</h1>
          <p className="muted">
            Every purchase order from request to delivery.
          </p>
          <p style={{ marginTop: 6 }}>
            <Pill tone="b">Live since {data.since}</Pill>
          </p>
        </div>
      </div>

      {data.warnings.map((w) => (
        <div key={w} className="banner warn" role="status">{w}</div>
      ))}

      <div className="kpis k4">
        <Kpi big v={totals.approved.toLocaleString()} l="Orders on the way" />
        <Kpi v={totals.pastExpected.toLocaleString()} l="Past expected delivery" />
        <Kpi v={totals.underReview.toLocaleString()} l="Waiting to be ordered" />
        <Kpi v={totals.deliveredThisMonth.toLocaleString()} l="Delivered this month" />
      </div>

      <section className="card" aria-labelledby="h-board">
        <h2 id="h-board">Order board</h2>
        <div className="board" style={{ gridTemplateColumns: 'repeat(3,minmax(220px,1fr))' }}>
          {cols.map((c) => {
            const more = c.count - c.cards.length;
            return (
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
                    key={o.rid}
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
                {more > 0 && <p className="muted" style={{ fontSize: 12 }}>+{more.toLocaleString()} more</p>}
                {!c.cards.length && <p className="muted" style={{ fontSize: 12 }}>Nothing since {data.since}</p>}
              </div>
            );
          })}

          <div className="col">
            <span className="spread">
              <span className="row" style={{ gap: 8 }}>
                <span className="dot d-g" />
                <b>Delivered</b>
              </span>
              <span className="muted num">{totals.deliveredThisMonth.toLocaleString()}</span>
            </span>
            {board.delivered.map((d) => (
              <div key={d.doNumber} className="tcard">
                <span className="spread" style={{ gap: 8 }}>
                  <b style={{ fontSize: 12 }}>{d.doNumber}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{d.status}</span>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{d.client} · {d.date}</span>
              </div>
            ))}
            {!board.delivered.length && <p className="muted" style={{ fontSize: 12 }}>No dispatches recorded</p>}
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
              {orders.length ? (
                orders.map((o) => (
                  <tr key={o.rid}>
                    <td><b>{o.id}</b></td>
                    <td>
                      <span className="pcell">
                        <b title={o.project}>{o.project}</b>
                        <span
                          className={`cl${o.client ? '' : ' none'}`}
                          title={o.client ?? 'No matching client in Active Projects 2026'}
                        >
                          {o.client ?? '—'}
                        </span>
                      </span>
                    </td>
                    <td><span className="cell-item">{o.item}</span></td>
                    <td><span className="cell-sup" title={o.supplier}>{o.supplier}</span></td>
                    <td className="num">{o.requested}</td>
                    <td className="muted">{o.ordered ?? '—'}</td>
                    <td className="num">{o.expected}</td>
                    <td><Pill tone={orderTone(o.status)}>{o.status}</Pill></td>
                    <td style={{ textAlign: 'right' }}>
                      <a className="lnk-open" href={recordUrl(o.rid)} target="_blank" rel="noopener noreferrer">
                        Open details <span aria-hidden="true">↗</span>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty">
                    <b>No requests since {data.since}.</b> The dashboard was cut over on {data.since} and only counts
                    payment requests submitted from that date onward. Anything older stays in the Base — open it in
                    Lark to see the full history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          {data.live ? 'Live from the Procurement Base, cached for 60 seconds. ' : 'Saved snapshot — the live Base read did not complete. '}
          Only requests submitted on or after <b>{data.since}</b> are counted; earlier history is excluded.
          {orders.length > 0 && <> Showing the latest {orders.length} of {totals.requests.toLocaleString()}.</>}{' '}
          Client name comes from Active Projects 2026 and only resolves where the project text matches — the rest show
          a dash.
        </p>
      </section>
    </>
  );
}
