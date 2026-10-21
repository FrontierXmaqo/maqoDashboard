import { Suspense } from 'react';
import Overview from '../../components/pages/Overview';
import { loadCi, loadResi } from '../../lib/data/sales';
import { loadLicensing } from '../../lib/data/licensing';
import { licensingOverview, type LicensingOverview } from '../../lib/licensing-model';
import { salesSummary } from '../../lib/sales-model';
import { viewerIsCeo } from '../../lib/auth/ceo';

export default async function Page() {
  let sales = null;
  let licensing: LicensingOverview | null = null;
  if (await viewerIsCeo()) {
    const [r, c, l] = await Promise.all([loadResi(), loadCi(), loadLicensing()]);
    sales = salesSummary(r.rows.projects, r.rows.sales, c.rows, [...r.warnings, ...c.warnings, ...l.warnings]);
    licensing = licensingOverview(l.rows, l.generatedAt);
  }
  return (
    <Suspense>
      <Overview sales={sales} licensing={licensing} />
    </Suspense>
  );
}
