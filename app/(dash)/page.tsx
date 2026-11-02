import { Suspense } from 'react';
import Overview from '../../components/pages/Overview';
import { loadCi, loadResi } from '../../lib/data/sales';
import { loadLicensing } from '../../lib/data/licensing';
import { loadProcurement } from '../../lib/data/procurement';
import { licensingOverview, type LicensingOverview } from '../../lib/licensing-model';
import { salesSummary } from '../../lib/sales-model';
import type { ProcurementData } from '../../lib/procurement';
import { viewerIsCeo } from '../../lib/auth/ceo';

export default async function Page() {
  let sales = null;
  let licensing: LicensingOverview | null = null;
  let procurement: ProcurementData | null = null;
  if (await viewerIsCeo()) {
    // Procurement shares the 60-second cache with /procurement, so this adds no extra Lark reads
    // in practice.
    const [r, c, l, p] = await Promise.all([loadResi(), loadCi(), loadLicensing(), loadProcurement()]);
    sales = salesSummary(r.rows.projects, r.rows.sales, c.rows, [...r.warnings, ...c.warnings, ...l.warnings]);
    licensing = licensingOverview(l.rows, l.generatedAt);
    procurement = p;
  }
  return (
    <Suspense>
      <Overview sales={sales} licensing={licensing} procurement={procurement} />
    </Suspense>
  );
}
