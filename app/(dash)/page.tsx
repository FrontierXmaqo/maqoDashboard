import { Suspense } from 'react';
import Overview from '../../components/pages/Overview';
import { loadCi, loadResi } from '../../lib/data/sales';
import { salesSummary } from '../../lib/sales-model';
import { viewerIsCeo } from '../../lib/auth/ceo';

export default async function Page() {
  let sales = null;
  if (await viewerIsCeo()) {
    const [r, c] = await Promise.all([loadResi(), loadCi()]);
    sales = salesSummary(r.rows, c.rows, [...r.warnings, ...c.warnings]);
  }
  return (
    <Suspense>
      <Overview sales={sales} />
    </Suspense>
  );
}
