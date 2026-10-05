import { Suspense } from 'react';
import Projects from '../../../components/pages/Projects';

export default function Page() {
  return (
    <Suspense>
      <Projects />
    </Suspense>
  );
}
