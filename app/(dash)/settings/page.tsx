import { Suspense } from 'react';
import Settings from '../../../components/pages/Settings';

export default function Page() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
