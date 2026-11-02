import Procurement from '../../../components/pages/Procurement';
import { loadProcurement } from '../../../lib/data/procurement';

// Read from the Procurement Base on each request (60 s server cache), never at build time.
export const dynamic = 'force-dynamic';

// The purchase-order table is paged from the URL (?page=2) so a page survives a refresh,
// works with the back button, and can be shared. The loader clamps bad values itself.
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { page } = await searchParams;
  return <Procurement data={await loadProcurement(page)} />;
}
