import { Suspense } from 'react';
import Calendar from '../../../components/pages/Calendar';
import { loadCiEvents, loadResi } from '../../../lib/data/sales';
import { viewerIsCeo } from '../../../lib/auth/ceo';
import { resiEvents } from '../../../lib/sales-model';

export default async function Page() {
  // Residential and C&I sit in CEO-only Bases, so only the CEO sees their site visits, installations and meetings.
  const sales = (await viewerIsCeo()) ? await Promise.all([loadResi(), loadCiEvents()]).then(([r, ci]) => [...resiEvents(r.rows.projects), ...ci]) : [];
  return (
    <Suspense>
      <Calendar sales={sales} />
    </Suspense>
  );
}
