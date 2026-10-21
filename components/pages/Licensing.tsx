'use client';

import { useState } from 'react';
import { AUTHORITIES, ATAP_DONE, NOT_STARTED, STALE_DAYS, daysSince, isApproved, isStale, licensingSummary, licensingUrl, type Licence, type LicensingCategory } from '../../lib/licensing-model';
import type { Tone } from '../../lib/model';
import type { SalesData } from '../../lib/sales-model';
import { Avatar, NotSet, Pill, Seg } from '../ui';
import { Kpi, LarkLink, SalesWarnings, kwp, rm } from './SalesBits';

type Cat = 'All' | LicensingCategory;

const tone = (s: string): Tone => (!s ? 'n' : s === ATAP_DONE || isApproved(s) ? 'g' : /reject|not/i.test(s) ? 'r' : /submit|seda approval/i.test(s) ? 'b' : 'a');
const St = ({ s }: { s: string }) => (s ? <Pill tone={tone(s)}>{s}</Pill> : <NotSet />);
const klDate = (ms: number) => new Date(ms).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
const Sales = ({ l }: { l: Licence }) => (l.sales[0] ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Avatar sm p={l.sales[0]} />{l.sales[0].name}</span> : <NotSet />);
const Ext = ({ href, label }: { href: string; label: string }) => (href ? <a href={href} target="_blank" rel="noopener noreferrer">Open<span className="sr"> {label} (new tab)</span></a> : <NotSet />);

/** Licensing applications. Resi follows the ATAP table, C&I follows the per-authority table in Lark. */
export default function Licensing({ data }: { data: SalesData<Licence[]> }) {
  const [cat, setCat] = useState<Cat>('All');
  const now = data.generatedAt;
  const list = data.rows.filter((l) => cat === 'All' || l.category === cat);
  const resi = list.filter((l) => l.category === 'Resi');
  // Stuck first, then the longest without an update.
  const ci = list.filter((l) => l.category === 'C&I').sort((a, b) => Number(a.done) - Number(b.done) || (a.lastUpdate ?? 0) - (b.lastUpdate ?? 0));
  const s = licensingSummary(list, now);
  const showResi = cat !== 'C&I';
  const showCi = cat !== 'Resi';
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Licensing</h1>
          <p className="muted">Residential ATAP and C&I authority approvals (SEDA, ST, TNB, MGTC), read live from Lark.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg<Cat> label="Category" value={cat} onChange={setCat} options={[['All', 'All'], ['Resi', 'Resi'], ['C&I', 'C&I']]} />
          {showResi && <LarkLink href={licensingUrl('Resi')}>Resi in Lark</LarkLink>}
          {showCi && <LarkLink href={licensingUrl('C&I')}>C&I in Lark</LarkLink>}
        </div>
      </div>
      <SalesWarnings list={data.warnings} />
      <div className="kpis k4">
        <Kpi big v={s.inProgress} l="Applications in progress" />
        <Kpi v={s.done} l="Fully approved" />
        {showResi && <Kpi v={s.pendingDocs} l="Resi documents pending" />}
        {showCi && <Kpi v={s.stale} l={`C&I no update ${STALE_DAYS}+ days`} />}
        {cat === 'Resi' && <Kpi v={rm(s.paidRm)} l="eATAP payments" />}
        {cat === 'C&I' && <Kpi v={kwp(s.kwp)} l="C&I capacity" />}
      </div>

      {showResi && (
        <section className="card" aria-labelledby="h-stage">
          <h2 id="h-stage">Resi: where ATAP applications are</h2>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
            {s.stages.length ? s.stages.map((x) => <Kpi key={x.stage} v={x.n} l={x.stage} />) : <p className="muted">No Resi applications yet.</p>}
          </div>
        </section>
      )}

      {showCi && (
        <section className="card" aria-labelledby="h-auth">
          <h2 id="h-auth">C&I: status by authority</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Authority</th><th>Cases by status</th></tr></thead>
              <tbody>
                {s.authorities.map((a) => (
                  <tr key={a.name}>
                    <th scope="row">{a.name}{a.name === 'MGTC' && <span className="muted"> (where needed)</span>}</th>
                    <td><span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>{a.statuses.length ? a.statuses.map((x) => <Pill key={x.status} tone={tone(x.status === NOT_STARTED ? '' : x.status)}>{x.status}: {x.n}</Pill>) : <NotSet />}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showCi && (
        <section className="card" aria-labelledby="h-ci">
          <h2 id="h-ci">C&I applications ({ci.length}), longest without update first</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Client</th><th>Type</th><th>kWp</th><th>Sales PIC</th>{AUTHORITIES.map((a) => <th key={a}>{a}</th>)}<th>Last update</th><th>Remarks</th><th>Chat</th></tr></thead>
              <tbody>
                {ci.length === 0 && <tr><td colSpan={11} className="empty">No C&I applications.</td></tr>}
                {ci.map((l) => {
                  const d = daysSince(l.lastUpdate, now);
                  return (
                    <tr key={l.id}>
                      <td>{l.client}</td>
                      <td>{l.type || <NotSet />}</td>
                      <td className="num">{l.kwp ?? <NotSet />}</td>
                      <td><Sales l={l} /></td>
                      {AUTHORITIES.map((a) => {
                        const x = l.authorities.find((y) => y.name === a);
                        return <td key={a}>{x ? (x.status ? <St s={x.status} /> : <Pill tone="n">{NOT_STARTED}</Pill>) : <span className="muted">Not needed</span>}</td>;
                      })}
                      <td className="num">{d == null ? <NotSet /> : isStale(l, now) ? <Pill tone="r">{d} days ago</Pill> : `${d} days ago`}</td>
                      <td>{l.remarks || <NotSet />}</td>
                      <td><Ext href={l.chatLink} label="WhatsApp group" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">Fully approved = every authority that applies is approved. No update {STALE_DAYS}+ days = the latest CAS, SEDA, ST, TNB or MGTC date of update is older than that.</p>
        </section>
      )}

      {showResi && (
        <section className="card" aria-labelledby="h-resi">
          <h2 id="h-resi">Resi applications ({resi.length})</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Client</th><th>Project ID</th><th>Documents</th><th>ATAP status</th><th>Submitted</th><th>eATAP payment</th><th>Sales PIC</th><th>Licensing PIC</th><th>Declaration</th><th>Signed form</th><th>ATAP cert</th></tr></thead>
              <tbody>
                {resi.length === 0 && <tr><td colSpan={11} className="empty">No Resi applications.</td></tr>}
                {resi.map((l) => (
                  <tr key={l.id}>
                    <td>{l.client}</td>
                    <td className="num">{l.projectId || <NotSet />}</td>
                    <td><St s={l.documentsStatus} /></td>
                    <td><St s={l.atapStatus} /></td>
                    <td className="num">{l.submittedAt == null ? <NotSet /> : `${klDate(l.submittedAt)} (${daysSince(l.submittedAt, now)} days)`}</td>
                    <td className="num">{l.payment != null ? rm(l.payment) : <NotSet />}</td>
                    <td><Sales l={l} /></td>
                    <td>{l.licensingPic[0]?.name ?? <NotSet />}</td>
                    <td><Ext href={l.declarationLink} label="declaration link" /></td>
                    <td>{l.signedForm ? '✓' : <NotSet />}</td>
                    <td>{l.cert ? '✓' : <NotSet />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
