import CiSales from '../../../components/pages/CiSales';
import { CeoOnly } from '../../../components/pages/SalesBits';
import { loadCi } from '../../../lib/data/sales';
import { viewerIsCeo } from '../../../lib/auth/ceo';

export default async function Page() {
  if (!(await viewerIsCeo())) return <CeoOnly />;
  return <CiSales data={await loadCi()} />;
}
