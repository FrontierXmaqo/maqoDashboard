import { Suspense } from 'react';
import Calendar from '../../../components/pages/Calendar';
import { loadResi } from '../../../lib/data/sales';
import { viewerIsCeo } from '../../../lib/auth/ceo';

export default async function Page() {
  // Residential projects sit in a CEO-only Base, so only the CEO sees their site visits and installations.
  const resi = (await viewerIsCeo()) ? (await loadResi()).rows.projects : [];
  return (
    <Suspense>
      <Calendar resi={resi} />
    </Suspense>
  );
}
