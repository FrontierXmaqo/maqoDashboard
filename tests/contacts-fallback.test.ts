// When the contacts range is not "all members", Lark refuses the root department (40004).
// The org chart must then load from the departments and users the range grants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const hits: string[] = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  hits.push(url.pathname + (url.searchParams.getAll('user_ids').length ? `?${url.searchParams.getAll('user_ids').join(',')}` : ''));
  res.setHeader('Content-Type', 'application/json');
  const send = (b: unknown) => res.end(JSON.stringify(b));
  const p = url.pathname;
  if (p === '/auth/v3/tenant_access_token/internal') return send({ code: 0, tenant_access_token: 't', expire: 7200 });
  if (p === '/contact/v3/departments/0/children') return send({ code: 40004, msg: 'no dept authority error' });
  if (p === '/contact/v3/scopes') return send({ code: 0, data: { department_ids: ['od-om'], user_ids: ['ou_solo'], has_more: false } });
  if (p === '/contact/v3/departments/batch') return send({ code: 0, data: { items: [{ open_department_id: 'od-om', name: 'O&M Department', parent_department_id: '0' }] } });
  if (p === '/contact/v3/departments/od-om/children') return send({ code: 0, data: { has_more: false, items: [{ open_department_id: 'od-team', name: 'Team North', parent_department_id: 'od-om' }] } });
  if (p === '/contact/v3/users/find_by_department') {
    const d = url.searchParams.get('department_id');
    const items = d === 'od-team' ? [{ open_id: 'ou_tech', en_name: 'Tech One', department_ids: ['od-team'] }] : d === 'od-om' ? [{ open_id: 'ou_lead', en_name: 'Lead One', department_ids: ['od-om'] }] : [];
    return send({ code: 0, data: { has_more: false, items } });
  }
  if (p === '/contact/v3/users/batch') return send({ code: 0, data: { items: [{ open_id: 'ou_solo', en_name: 'Solo Person', department_ids: [] }] } });
  if (p === '/bitable/v1/apps/B/tables') return send({ code: 0, data: { has_more: false, items: [] } });
  if (p.endsWith('/records/search')) return send({ code: 0, data: { has_more: false, items: [] } });
  return send({ code: 404, msg: 'unexpected ' + p });
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
Object.assign(process.env, {
  LARK_API_BASE_FOR_TESTS: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  LARK_APP_ID: 'cli_t',
  LARK_APP_SECRET: 's',
  LARK_BASE_TOKEN: 'B',
});
const { loadSnapshot } = await import('../lib/data/snapshot.ts');

test('limited contacts range: loads granted departments, their sub-departments and granted users', async () => {
  const snap = await loadSnapshot();
  server.close();
  assert.deepEqual(snap.warnings, []);
  const byId = Object.fromEntries(snap.people.map((p) => [p.openId, p]));
  assert.equal(byId.ou_lead.dept, 'O&M');
  assert.equal(byId.ou_tech.dept, 'O&M'); // Team North maps through its parent, O&M Department
  assert.equal(byId.ou_solo.name, 'Solo Person');
  assert.equal(byId.ou_solo.dept, null);
  assert.ok(hits.includes('/contact/v3/users/batch?ou_solo'));
});
