'use client';

import { useState } from 'react';
import { ATAP_DONE, ATAP_STAGES, AUTHORITIES, NOT_STARTED, STALE_DAYS, daysSince, isApproved, isStale, licenceRecordUrl, licensingSummary, licensingUrl, type Licence, type LicensingCategory } from '../../lib/licensing-model';
import type { Tone } from '../../lib/model';
import type { SalesData } from '../../lib/sales-model';
import { NotSet, Pill, Seg } from '../ui';
import { Kpi, LarkLink, SalesWarnings } from './SalesBits';

type Cat = 'All' | LicensingCategory;

const tone = (s: string): Tone => (!s ? 'n' : s === ATAP_DONE || isApproved(s) ? 'g' : /reject|not/i.test(s) ? 'r' : /submit|seda approval/i.test(s) ? 'b' : 'a');
const stageNo = (l: Licence) => ATAP_STAGES.indexOf(l.atapStatus) + 1; // 0 = not set or unknown

/** Resi: one dot per ATAP step, filled up to the current step. */
function Steps({ l }: { l: Licence }) {
  const n = stageNo(l);
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} role="img" aria-label={`Step ${n} of ${ATAP_STAGES.length}`}>
      {ATAP_STAGES.map((s, i) => <span key={s} className={`dot d-${i < n ? (l.done ? 'g' : 'b') : 'n'}`} title={s} />)}
      <span className="muted num" style={{ marginLeft: 4 }}>{n}/{ATAP_STAGES.length}</span>
    </span>
  );
}

/** C&I: one chip per authority. */
const MARK: Record<Tone, string> = { g: '✓', b: '◐', a: '◐', r: '✕', n: '○' };
function Authorities({ l }: { l: Licence }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {AUTHORITIES.map((a) => {
        const x = l.authorities.find((y) => y.name === a);
        if (!x) return <span key={a} className="pill t-n" style={{ opacity: 0.55 }} title={`${a}: not needed`}>{a} –</span>;
        const t = tone(x.status);
        return <span key={a} className={`pill t-${t}`} title={`${a}: ${x.status || NOT_STARTED}`}>{a} {MARK[t]}<span className="sr"> {x.status || NOT_STARTED}</span></span>;
      })}
    </span>
  );
}

const Open = ({ l }: { l: Licence }) => (
  <a className="btn" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }} href={licenceRecordUrl(l.category, l.id)} target="_blank" rel="noopener noreferrer">
    Open in Lark <span aria-hidden="true">↗</span><span className="sr"> {l.client} (new tab)</span>
  </a>
);

const Client = ({ l }: { l: Licence }) => (
  <td>
    <div>{l.client}</div>
    {l.sales[0] && <div className="muted">{l.sales[0].name}</div>}
  </td>
);

/** Licensing progress for Resi (ATAP steps) and C&I (SEDA, ST, TNB, MGTC). Details live in Lark. */
export default function Licensing({ data }: { data: SalesData<Licence[]> }) {
  const [cat, setCat] = useState<Cat>('All');
  const now = data.generatedAt;
  const list = data.rows.filter((l) => cat === 'All' || l.category === cat);
  // Open cases first; least progressed (Resi) or longest without an update (C&I) at the top.
  const resi = list.filter((l) => l.category === 'Resi').sort((a, b) => Number(a.done) - Number(b.done) || stageNo(a) - stageNo(b));
  const ci = list.filter((l) => l.category === 'C&I').sort((a, b) => Number(a.done) - Number(b.done) || (a.lastUpdate ?? 0) - (b.lastUpdate ?? 0));
  const s = licensingSummary(list, now);
  const showResi = cat !== 'C&I';
  const showCi = cat !== 'Resi';
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Licensing</h1>
          <p className="muted">Where every application stands. Open a client in Lark for documents and details.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg<Cat> label="Category" value={cat} onChange={setCat} options={[['All', 'All'], ['Resi', 'Resi'], ['C&I', 'C&I']]} />
          {showResi && <LarkLink href={licensingUrl('Resi')}>Resi in Lark</LarkLink>}
          {showCi && <LarkLink href={licensingUrl('C&I')}>C&I in Lark</LarkLink>}
        </div>
      </div>
      <SalesWarnings list={data.warnings} />
      <div className="kpis k4">
        <Kpi big v={s.inProgress} l="In progress" />
        <Kpi v={s.done} l="Fully approved" />
        {showResi && <Kpi v={s.pendingDocs} l="Resi documents pending" />}
        {showCi && <Kpi v={s.stale} l={`C&I no update ${STALE_DAYS}+ days`} />}
      </div>

      {showResi && (
        <section className="card" aria-labelledby="h-resi">
          <h2 id="h-resi">Resi ATAP progress ({resi.length})</h2>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {ATAP_STAGES.map((st, i) => <Kpi key={st} v={s.stages.find((x) => x.stage === st)?.n ?? 0} l={`${i + 1}. ${st}`} />)}
          </div>
          <div className="tbl">
            <table>
              <thead><tr><th>Client</th><th>Progress</th><th>Current step</th><th>Submitted</th><th><span className="sr">Lark</span></th></tr></thead>
              <tbody>
                {resi.length === 0 && <tr><td colSpan={5} className="empty">No Resi applications.</td></tr>}
                {resi.map((l) => (
                  <tr key={l.id}>
                    <Client l={l} />
                    <td><Steps l={l} /></td>
                    <td>{l.atapStatus ? <Pill tone={tone(l.atapStatus)}>{l.atapStatus}</Pill> : <NotSet />}</td>
                    <td className="num">{l.submittedAt == null ? <NotSet /> : `${daysSince(l.submittedAt, now)} days ago`}</td>
                    <td><Open l={l} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showCi && (
        <section className="card" aria-labelledby="h-ci">
          <h2 id="h-ci">C&I approvals progress ({ci.length})</h2>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {s.authorities.map((a) => {
              const counted = a.statuses.reduce((t, x) => t + x.n, 0);
              const ok = a.statuses.filter((x) => isApproved(x.status)).reduce((t, x) => t + x.n, 0);
              return <Kpi key={a.name} v={`${ok}/${counted}`} l={`${a.name} approved`} />;
            })}
          </div>
          <div className="tbl">
            <table>
              <thead><tr><th>Client</th><th>SEDA · ST · TNB · MGTC</th><th>Last update</th><th><span className="sr">Lark</span></th></tr></thead>
              <tbody>
                {ci.length === 0 && <tr><td colSpan={4} className="empty">No C&I applications.</td></tr>}
                {ci.map((l) => {
                  const d = daysSince(l.lastUpdate, now);
                  return (
                    <tr key={l.id}>
                      <Client l={l} />
                      <td><Authorities l={l} /></td>
                      <td className="num">{l.done ? <Pill tone="g">All approved</Pill> : d == null ? <NotSet /> : isStale(l, now) ? <Pill tone="r">{d} days ago</Pill> : `${d} days ago`}</td>
                      <td><Open l={l} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">✓ approved · ◐ in progress · ✕ rejected · ○ not started · – not needed. Hover a chip for the exact status. Red = no update in {STALE_DAYS}+ days.</p>
        </section>
      )}
    </>
  );
}
