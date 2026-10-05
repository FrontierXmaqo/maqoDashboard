import { Suspense } from 'react';
import Tasks from '../../../components/pages/Tasks';

export default function Page() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}
