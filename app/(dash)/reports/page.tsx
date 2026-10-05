import { Suspense } from 'react';
import Reports from '../../../components/pages/Reports';

export default function Page() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}
