import { Suspense } from 'react';
import Overview from '../../components/pages/Overview';
import { loadCi, loadCiLeads, loadResi } from '../../lib/data/sales';
import { salesSummary } from '../../lib/sales-model';
import { viewerIsCeo } from '../../lib/auth/ceo';

export default async function Page() {
  let sales = null;
  if (await viewerIsCeo()) {
    const [r, c, leads] = await Promise.all([loadResi(), loadCi(), loadCiLeads()]);
    sales = { ...salesSummary(r.rows.projects, r.rows.sales, c.rows, [...r.warnings, ...c.warnings]), ciLeads: leads };
  }
  return (
    <Suspense>
      <Overview sales={sales} />
    </Suspense>
  );
}
