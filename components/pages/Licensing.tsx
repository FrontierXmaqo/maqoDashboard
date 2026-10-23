'use client';

import { useState } from 'react';
import { ATAP_DONE, ATAP_STAGES, NOT_STARTED, SMALL_KWP, STALE_DAYS, isApproved, isSmall, licenceIssues, isStale, licenceRecordUrl, licensingSummary, licensingUrl, type Licence, type LicensingCategory } from '../../lib/licensing-model';
import type { Tone } from '../../lib/model';
import type { SalesData } from '../../lib/sales-model';
import { NotSet, Pill, Seg } from '../ui';
import { Kpi, LarkLink, SalesWarnings } from './SalesBits';

type Cat = 'All' | LicensingCategory;

const klDate = (ms: number) => new Date(ms).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
const tone = (s: string): Tone => (!s ? 'n' : s === ATAP_DONE || isApproved(s) ? 'g' : /reject|not/i.test(s) ? 'r' : /submit|seda approval/i.test(s) ? 'b' : 'a');
const stageNo = (l: Licence) => ATAP_STAGES.indexOf(l.atapStatus) + 1; // 0 = not set or unknown

/** Resi: one dot per ATAP step. Steps before the current one are done, the current one is in progress. */
function Steps({ l }: { l: Licence }) {
  const n = stageNo(l);
  const done = l.done ? ATAP_STAGES.length : Math.max(n - 1, 0);
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} role="img" aria-label={`${done} of ${ATAP_STAGES.length} steps done`}>
      {ATAP_STAGES.map((s, i) => <span key={s} className={`dot d-${i < done ? 'g' : i === n - 1 ? 'a' : 'n'}`} title={s} />)}
      <span className="muted num" style={{ marginLeft: 4 }}>{done}/{ATAP_STAGES.length}</span>
    </span>
  );
}

/** Rows whose Lark data contradicts itself. */
function Issues({ l }: { l: Licence }) {
  const list = licenceIssues(l);
  return list.length ? <div style={{ marginTop: 4 }}><span className="pill t-r">Check in Lark</span> <span className="muted">{list.join('. ')}.</span></div> : null;
}

/** C&I: one chip per authority. */
const MARK: Record<Tone, string> = { g: '✓', b: '◐', a: '◐', r: '✕', n: '○' };
function Authorities({ l }: { l: Licence }) {
  const ok = l.authorities.filter((a) => isApproved(a.status)).length;
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="muted num">{ok}/{l.authorities.length}</span>
      {l.authorities.map((x) => {
        const t = tone(x.status);
        return <span key={x.name} className={`pill t-${t}`} title={`${x.name}: ${x.status || NOT_STARTED}`}>{x.name} {MARK[t]}<span className="sr"> {x.status || NOT_STARTED}</span></span>;
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

/** One C&I size group: a row per client, one chip per authority that case needs. */
function CiTable({ title, rows, now }: { title: string; rows: Licence[]; now: number }) {
  return (
    <>
      <h3>{title} ({rows.length})</h3>
      <div className="tbl">
        <table>
          <thead><tr><th>Client</th><th>Approved · authorities in order</th><th>Last update</th><th><span className="sr">Lark</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="empty">No C&I applications.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id}>
                <Client l={l} />
                <td><Authorities l={l} /></td>
                <td className="num">{l.done ? <Pill tone="g">All approved</Pill> : l.lastUpdate == null ? <NotSet /> : isStale(l, now) ? <Pill tone="r">{klDate(l.lastUpdate)}</Pill> : klDate(l.lastUpdate)}</td>
                <td><Open l={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Licensing progress for Resi (ATAP steps) and C&I (CAS, SEDA, ST, TNB, MGTC). Details live in Lark. */
export default function Licensing({ data }: { data: SalesData<Licence[]> }) {
  const [cat, setCat] = useState<Cat>('All');
  const [step, setStep] = useState<string | null>(null);
  const now = data.generatedAt;
  const list = data.rows.filter((l) => cat === 'All' || l.category === cat);
  // Open cases first; least progressed (Resi) or longest without an update (C&I) at the top.
  const resiAll = list.filter((l) => l.category === 'Resi');
  const resi = resiAll.filter((l) => !step || l.atapStatus === step).sort((a, b) => Number(a.done) - Number(b.done) || stageNo(a) - stageNo(b));
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
          <h2 id="h-resi">Resi ATAP progress ({resiAll.length})</h2>
          <p className="muted">Click a step to list only the clients at that step.</p>
          <div className="kpis" role="group" aria-label="Filter by ATAP step" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {ATAP_STAGES.map((st, i) => (
              <button key={st} type="button" className={`kpi${step === st ? ' big' : ''}`} aria-pressed={step === st} onClick={() => setStep(step === st ? null : st)}>
                <span className="muted">{i + 1}. {st}</span>
                <span className="v num">{s.stages.find((x) => x.stage === st)?.n ?? 0}</span>
              </button>
            ))}
          </div>
          {step && <div className="row"><span className="muted">Showing {resi.length} at “{step}”.</span><button type="button" className="btn sm" onClick={() => setStep(null)}>Show all steps</button></div>}
          <div className="tbl">
            <table>
              <thead><tr><th>Client</th><th>Progress</th><th>Current step</th><th>Submitted</th><th><span className="sr">Lark</span></th></tr></thead>
              <tbody>
                {resi.length === 0 && <tr><td colSpan={5} className="empty">{step ? 'No clients at this step.' : 'No Resi applications.'}</td></tr>}
                {resi.map((l) => (
                  <tr key={l.id}>
                    <Client l={l} />
                    <td><Steps l={l} /></td>
                    <td>{l.atapStatus ? <Pill tone={tone(l.atapStatus)}>{l.atapStatus}</Pill> : <NotSet />}<Issues l={l} /></td>
                    <td className="num">{l.submittedAt == null ? <NotSet /> : klDate(l.submittedAt)}</td>
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
          <CiTable title={`Above ${SMALL_KWP} kWp`} rows={ci.filter((l) => !isSmall(l))} now={now} />
          <CiTable title={`${SMALL_KWP} kWp and below`} rows={ci.filter(isSmall)} now={now} />
          <p className="muted">Chips run left to right in the order each authority is processed; SELCO cases skip SEDA. ✓ approved · ◐ in progress · ✕ rejected · ○ not started. Hover a chip for the exact status. Red = no update in {STALE_DAYS}+ days. Cases with no kWp in Lark are listed under above {SMALL_KWP} kWp.</p>
        </section>
      )}
    </>
  );
}
