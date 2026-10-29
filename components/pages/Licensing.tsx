'use client';

import { useState } from 'react';
import { ATAP_DONE, ATAP_STAGES, NOT_STARTED, SMALL_KWP, STALE_DAYS, hintFor, isApproved, licenceIssues, daysSince, isStale, licenceRecordUrl, licensingSummary, licensingUrl, type Licence, type LicensingCategory } from '../../lib/licensing-model';
import type { Tone } from '../../lib/model';
import type { SalesData } from '../../lib/sales-model';
import { NotSet, Pill, Seg } from '../ui';
import { Kpi, LarkLink, SalesWarnings } from './SalesBits';

type Cat = 'All' | LicensingCategory;
type View = 'grouped' | 'table';

const klDate = (ms: number) => new Date(ms).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
const tone = (s: string): Tone => (!s ? 'n' : s === ATAP_DONE || isApproved(s) ? 'g' : /reject|not/i.test(s) ? 'r' : /submit|seda approval/i.test(s) ? 'b' : 'a');
const stageNo = (l: Licence) => ATAP_STAGES.indexOf(l.atapStatus) + 1; // 0 = not set or unknown
/** Blank or unrecognised statuses still get a group, at the end, so no client disappears. */
const stageOf = (l: Licence) => l.atapStatus || 'Not set';

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

/** C&I: one chip per authority needed, in route order, with its date underneath. */
const MARK: Record<Tone, string> = { g: '✓', b: '◐', a: '◐', r: '✕', n: '○' };
function Authorities({ l }: { l: Licence }) {
  const ok = l.authorities.filter((a) => isApproved(a.status)).length;
  return (
    <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <span className="muted num" style={{ minWidth: 28 }}>{ok}/{l.authorities.length}</span>
      {l.authorities.map((x) => {
        const t = tone(x.status);
        return (
          <span key={x.name} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className={`pill t-${t}`} title={`${x.name}: ${x.status || NOT_STARTED}`}>{x.name} {MARK[t]}<span className="sr"> {x.status || NOT_STARTED}</span></span>
            <span className="muted num" style={{ fontSize: 11 }}>{x.at == null ? '–' : klDate(x.at)}</span>
          </span>
        );
      })}
    </span>
  );
}

const Open = ({ l, sm }: { l: Licence; sm?: boolean }) => (
  <a className={`btn${sm ? ' sm' : ''}`} style={{ textDecoration: 'none', whiteSpace: 'nowrap' }} href={licenceRecordUrl(l.category, l.id)} target="_blank" rel="noopener noreferrer">
    Open in Lark <span aria-hidden="true">↗</span><span className="sr"> {l.client} (new tab)</span>
  </a>
);

const Client = ({ l }: { l: Licence }) => (
  <td>
    <div>{l.client}</div>
    {l.sales[0] && <div className="muted">{l.sales[0].name}</div>}
  </td>
);

/** Oldest submission first inside a step: whoever has waited longest is at the top. Rows without a date go last. */
const bySubmitted = (a: Licence, b: Licence) => {
  if (a.submittedAt == null && b.submittedAt == null) return a.client.localeCompare(b.client);
  if (a.submittedAt == null) return 1;
  if (b.submittedAt == null) return -1;
  return a.submittedAt - b.submittedAt || a.client.localeCompare(b.client);
};

/** One Resi step: a heading with the count, and the clients sitting at it underneath. */
function StepGroup({ stage, n, rows, open, onToggle }: { stage: string; n: number; rows: Licence[]; open: boolean; onToggle: () => void }) {
  return (
    <div className="grp-i" data-open={open}>
      <button type="button" className="grp-h" aria-expanded={open} onClick={onToggle}>
        <span className="grp-n num">{n || '–'}</span>
        <span className="grp-t">
          <b>{stage}</b>
          <span className="muted">{hintFor(stage)}</span>
        </span>
        <span className="grp-c num">{rows.length}</span>
        <span className="grp-x" aria-hidden="true">▼</span>
      </button>
      {open && (
        <div className="grp-b">
          {rows.map((l) => (
            <div className="grp-r" key={l.id}>
              <div>
                <div>{l.client}</div>
                {l.sales[0] && <div className="muted">{l.sales[0].name}</div>}
                <Issues l={l} />
              </div>
              <div className="num muted">{l.submittedAt == null ? <NotSet /> : klDate(l.submittedAt)}</div>
              <Steps l={l} />
              <div><Open l={l} sm /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One C&I size group: a row per client, one chip per authority that case needs. */
function CiTable({ title, rows, now }: { title: string; rows: Licence[]; now: number }) {
  return (
    <>
      <h3>{title} ({rows.length})</h3>
      <div className="tbl">
        <table style={{ tableLayout: 'fixed', minWidth: 900 }}>
          <colgroup><col style={{ width: '26%' }} /><col style={{ width: '38%' }} /><col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '14%' }} /></colgroup>
          <thead><tr><th>Client</th><th>Approved · authorities in order</th><th>Last update</th><th>Days waiting</th><th><span className="sr">Lark</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No C&I applications.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id}>
                <Client l={l} />
                <td><Authorities l={l} /></td>
                <td className="num">{l.done ? <Pill tone="g">All approved</Pill> : l.lastUpdate == null ? <NotSet /> : isStale(l, now) ? <Pill tone="r">{klDate(l.lastUpdate)}</Pill> : klDate(l.lastUpdate)}</td>
                <td className="num">{l.done ? '–' : l.lastUpdate == null ? <NotSet /> : `${daysSince(l.lastUpdate, now)} d`}</td>
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
  const [view, setView] = useState<View>('grouped');
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set<string>());
  const [step, setStep] = useState<string | null>(null);
  const [hideDone, setHideDone] = useState(false);
  const [q, setQ] = useState('');
  const [ciQ, setCiQ] = useState('');
  const [rep, setRep] = useState('');
  const [auth, setAuth] = useState<string | null>(null);
  const now = data.generatedAt;
  const has = (l: Licence, text: string) => l.client.toLowerCase().includes(text.trim().toLowerCase());
  // Hiding completed also removes them from every count on the page.
  const list = data.rows.filter((l) => (cat === 'All' || l.category === cat) && !(hideDone && l.done));
  // Open cases first; least progressed (Resi) or longest without an update (C&I) at the top.
  const resiAll = list.filter((l) => l.category === 'Resi');
  const reps = [...new Set(resiAll.flatMap((l) => l.sales.map((p) => p.name)))].sort((a, b) => a.localeCompare(b));
  const resi = resiAll.filter((l) => (!step || l.atapStatus === step) && has(l, q) && (!rep || l.sales.some((p) => p.name === rep))).sort((a, b) => Number(a.done) - Number(b.done) || stageNo(a) - stageNo(b));
  // Grouped view: every step that has clients, in process order, then any status Lark does not recognise.
  const present = [...new Set(resi.map(stageOf))];
  const order = [...ATAP_STAGES.filter((s) => present.includes(s)), ...present.filter((s) => !ATAP_STAGES.includes(s)).sort()];
  const groups = order.map((stage) => ({ stage, n: ATAP_STAGES.indexOf(stage) + 1, rows: resi.filter((l) => stageOf(l) === stage).sort(bySubmitted) }));
  const ci = list.filter((l) => l.category === 'C&I' && has(l, ciQ) && (!auth || l.authorities.some((a) => a.name === auth && !isApproved(a.status)))).sort((a, b) => Number(a.done) - Number(b.done) || (a.lastUpdate ?? 0) - (b.lastUpdate ?? 0));
  const s = licensingSummary(list, now);
  const showResi = cat !== 'C&I';
  const showCi = cat !== 'Resi';
  // Grouped browsing makes the step filter redundant, so switching back to the table clears it.
  const changeView = (v: View) => { setView(v); if (v === 'grouped') setStep(null); };
  const toggleGroup = (stage: string) => setClosed((prev) => { const next = new Set(prev); if (next.has(stage)) next.delete(stage); else next.add(stage); return next; });
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="title">Licensing</h1>
          <p className="muted">Where every application stands. Open a client in Lark for documents and details.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg<Cat> label="Category" value={cat} onChange={setCat} options={[['All', 'All'], ['Resi', 'Resi'], ['C&I', 'C&I']]} />
          <button type="button" className="btn" aria-pressed={hideDone} onClick={() => setHideDone(!hideDone)}>{hideDone ? 'Show completed' : 'Hide completed'}</button>
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
          <div className="spread">
            <h2 id="h-resi">Resi ATAP progress ({resiAll.length})</h2>
            <div className="row" style={{ gap: 8 }}>
              {view === 'grouped' && (
                <>
                  <button type="button" className="btn sm" onClick={() => setClosed(new Set<string>())}>Expand all</button>
                  <button type="button" className="btn sm" onClick={() => setClosed(new Set<string>(order))}>Collapse all</button>
                </>
              )}
              <Seg<View> label="Resi layout" value={view} onChange={changeView} options={[['grouped', 'Grouped by step'], ['table', 'Flat table']]} />
            </div>
          </div>
          <p className="muted">
            {view === 'grouped'
              ? 'Each step lists the clients sitting at it, longest wait first. Click a step to fold it away.'
              : 'Click a step to list only the clients at that step.'}
          </p>
          <div className="row">
            <input className="inp" style={{ maxWidth: 240 }} type="search" aria-label="Search Resi" placeholder="Search client" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="inp" style={{ maxWidth: 180 }} aria-label="Sales person" value={rep} onChange={(e) => setRep(e.target.value)}>
              <option value="">All sales</option>
              {reps.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {view === 'grouped' ? (
            <>
              <span className="segbar" role="img" aria-label={`${resi.length} Resi applications across ${groups.length} steps`}>
                {groups.map((g) => (
                  <i key={g.stage} className={`d-${tone(g.stage)}`} style={{ width: `${(g.rows.length / (resi.length || 1)) * 100}%` }} title={`${g.stage}: ${g.rows.length}`} />
                ))}
              </span>
              {groups.length === 0 ? (
                <p className="empty">{q || rep ? 'No clients match this search.' : 'No Resi applications.'}</p>
              ) : (
                <div className="grp">
                  {groups.map((g) => (
                    <StepGroup key={g.stage} stage={g.stage} n={g.n} rows={g.rows} open={!closed.has(g.stage)} onToggle={() => toggleGroup(g.stage)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </section>
      )}

      {showCi && (
        <section className="card" aria-labelledby="h-ci">
          <h2 id="h-ci">C&I approvals progress ({ci.length})</h2>
          <p className="muted">Click an authority to list only the cases still waiting on it.</p>
          <div className="row"><input className="inp" style={{ maxWidth: 240 }} type="search" aria-label="Search C&I" placeholder="Search client" value={ciQ} onChange={(e) => setCiQ(e.target.value)} /></div>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
            {s.authorities.map((a) => {
              const counted = a.statuses.reduce((t, x) => t + x.n, 0);
              const ok = a.statuses.filter((x) => isApproved(x.status)).reduce((t, x) => t + x.n, 0);
              return (
                <button key={a.name} type="button" className={`kpi${auth === a.name ? ' big' : ''}`} aria-pressed={auth === a.name} onClick={() => setAuth(auth === a.name ? null : a.name)}>
                  <span className="muted">{a.name} approved</span>
                  <span className="v num">{ok}/{counted}</span>
                </button>
              );
            })}
          </div>
          {auth && <div className="row"><span className="muted">Showing {ci.length} still waiting on {auth}.</span><button type="button" className="btn sm" onClick={() => setAuth(null)}>Show all</button></div>}
          <CiTable title={`Above ${SMALL_KWP} kWp`} rows={ci.filter((l) => l.size === 'large')} now={now} />
          <CiTable title={`${SMALL_KWP} kWp and below`} rows={ci.filter((l) => l.size === 'small')} now={now} />
          <CiTable title="No category" rows={ci.filter((l) => l.size === 'none')} now={now} />
          <p className="muted">Chips run in the order each authority is processed; only the authorities a case needs are shown (SELCO skips SEDA, small systems skip CAS, ST and MGTC). ✓ approved · ◐ in progress · ✕ rejected · ○ not started. Red = no update in {STALE_DAYS}+ days. Size comes from the Lark CATEGORY column (kWp if blank). Cases with neither are under No category and show the full route until a category is set.</p>
        </section>
      )}
    </>
  );
}
