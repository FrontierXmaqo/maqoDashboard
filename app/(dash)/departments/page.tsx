import { Suspense } from 'react';
import Departments from '../../../components/pages/Departments';

export default function Page() {
  return (
    <Suspense>
      <Departments />
    </Suspense>
  );
}
