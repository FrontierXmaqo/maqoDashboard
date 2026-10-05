import { notFound } from 'next/navigation';
import { devLoginEnabled } from '../../lib/auth/session';
import { loadSnapshot } from '../../lib/data/snapshot';
import { DevLoginForm } from '../../components/DevLoginForm';

export const dynamic = 'force-dynamic';

export default async function DevLogin() {
  if (!devLoginEnabled()) notFound();
  const snap = await loadSnapshot();
  const people = snap.people.map((p) => ({ openId: p.openId, name: p.name, dept: p.dept })).sort((a, b) => a.name.localeCompare(b.name));
  return <DevLoginForm people={people} />;
}
