import { Suspense } from 'react';
import MyWork from '../../../components/pages/MyWork';

export default function Page() {
  return (
    <Suspense>
      <MyWork />
    </Suspense>
  );
}
