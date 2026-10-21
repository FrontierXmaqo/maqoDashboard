import Licensing from '../../../components/pages/Licensing';
import { loadLicensing } from '../../../lib/data/licensing';

export default async function Page() {
  return <Licensing data={await loadLicensing()} />;
}
