'use client';

import { useState } from 'react';
import { ATAP_DONE, licensingSummary, licensingUrl, type Licence, type LicensingCategory } from '../../lib/licensing-model';
import type { SalesData } from '../../lib/sales-model';
import { Avatar, NotSet, Pill, Seg } from '../ui';
import { Kpi, LarkLink, SalesWarnings, rm } from './SalesBits';

type Cat = 'All' | LicensingCategory;

const stageTone = (s: string) => (s === ATAP_DONE ? 'g' : s.startsWith('Pending SEDA') || s.startsWith('Submitted') ? 'b' : s ? 'a' : 'n');

/** ATAP applications for Resi and C&I. Columns follow the Lark views. */
export default function Licensing({ data }: { data: SalesData<Licence[]> }) {
  const [cat, setCat] = useState<Cat>('All');
  const list = data.rows.filter((l) => cat === 'All' || l.category === cat);
  const s = licensingSummary(list);
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Licensing</h1>
          <p className="muted">ATAP applications for Residential and C&I, read live from Lark.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg<Cat> label="Category" value={cat} onChange={setCat} options={[['All', 'All'], ['Resi', 'Resi'], ['C&I', 'C&I']]} />
          {cat !== 'C&I' && <LarkLink href={licensingUrl('Resi')}>Resi in Lark</LarkLink>}
          {cat !== 'Resi' && <LarkLink href={licensingUrl('C&I')}>C&I in Lark</LarkLink>}
        </div>
      </div>
      <SalesWarnings list={data.warnings} />
      <div className="kpis k4">
        <Kpi big v={s.inProgress} l="Applications in progress" />
        <Kpi v={s.done} l="ATAP approved" />
        <Kpi v={s.pendingDocs} l="Documents pending" />
        <Kpi v={rm(s.paidRm)} l="eATAP payments" />
      </div>
      <section className="card" aria-labelledby="h-stage">
        <h2 id="h-stage">Where applications are</h2>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          {s.stages.length ? s.stages.map((x) => <Kpi key={x.stage} v={x.n} l={x.stage} />) : <p className="muted">No applications yet.</p>}
        </div>
      </section>
      <section className="card" aria-labelledby="h-apps">
        <h2 id="h-apps">Applications ({list.length})</h2>
        <div className="tbl">
          <table>
            <thead>
              <tr>{cat === 'All' && <th>Category</th>}<th>Client</th><th>Project ID</th><th>Documents</th><th>ATAP status</th><th>eATAP payment</th><th>Sales PIC</th><th>Declaration</th><th>Signed form</th><th>ATAP cert</th></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={10} className="empty">No applications in this category.</td></tr>}
              {list.map((l) => (
                <tr key={`${l.category}:${l.id}`}>
                  {cat === 'All' && <td>{l.category}</td>}
                  <td>{l.client || <NotSet />}</td>
                  <td className="num">{l.projectId || <NotSet />}</td>
                  <td>{l.documentsStatus ? <Pill tone={l.documentsStatus.toLowerCase().startsWith('pending') ? 'a' : 'g'}>{l.documentsStatus}</Pill> : <NotSet />}</td>
                  <td>{l.atapStatus ? <Pill tone={stageTone(l.atapStatus)}>{l.atapStatus}</Pill> : <NotSet />}</td>
                  <td className="num">{l.payment != null ? rm(l.payment) : <NotSet />}</td>
                  <td>{l.sales[0] ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Avatar sm p={l.sales[0]} />{l.sales[0].name}</span> : <NotSet />}</td>
                  <td>{l.declarationLink ? <a href={l.declarationLink} target="_blank" rel="noopener noreferrer">Open<span className="sr"> declaration link (new tab)</span></a> : <NotSet />}</td>
                  <td>{l.signedForm ? '✓' : <NotSet />}</td>
                  <td>{l.cert ? '✓' : <NotSet />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
