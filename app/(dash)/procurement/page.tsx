import Procurement from '../../../components/pages/Procurement';
import { loadProcurement } from '../../../lib/data/procurement';

// Read from the Procurement Base on each request (60 s server cache), never at build time.
export const dynamic = 'force-dynamic';

export default async function Page() {
  return <Procurement data={await loadProcurement()} />;
}
