import { Suspense } from 'react';
import Employees from '../../../components/pages/Employees';

export default function Page() {
  return (
    <Suspense>
      <Employees />
    </Suspense>
  );
}
