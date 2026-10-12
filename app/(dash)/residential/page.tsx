import ResiSales from '../../../components/pages/ResiSales';
import { CeoOnly } from '../../../components/pages/SalesBits';
import { loadResi } from '../../../lib/data/sales';
import { viewerIsCeo } from '../../../lib/auth/ceo';

export default async function Page() {
  if (!(await viewerIsCeo())) return <CeoOnly />;
  return <ResiSales data={await loadResi()} />;
}
