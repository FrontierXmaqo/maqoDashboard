import type { ReactNode } from 'react';
import { loadSnapshot } from '../../lib/data/snapshot';
import { DataProvider } from '../../components/DataProvider';
import { Shell } from '../../components/Shell';

// Data is read from Lark on each request (with a 60 s server cache), never at build time.
export const dynamic = 'force-dynamic';

export default async function DashLayout({ children }: { children: ReactNode }) {
  const snapshot = await loadSnapshot();
  return (
    <DataProvider snapshot={snapshot}>
      <Shell>{children}</Shell>
    </DataProvider>
  );
}
