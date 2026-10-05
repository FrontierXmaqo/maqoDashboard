import { Suspense } from 'react';
import Calendar from '../../../components/pages/Calendar';

export default function Page() {
  return (
    <Suspense>
      <Calendar />
    </Suspense>
  );
}
