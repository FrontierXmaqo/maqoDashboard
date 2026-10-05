// Checks the exact HTTP requests the write path sends, against a local mock of Lark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

type Seen = { method: string; path: string; query: Record<string, string>; body: unknown; auth: string };
const seen: Seen[] = [];
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://x');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/auth/v3/tenant_access_token/internal') return res.end(JSON.stringify({ code: 0, tenant_access_token: 't-mock', expire: 7200 }));
    seen.push({ method: req.method ?? '', path: url.pathname, query: Object.fromEntries(url.searchParams), body: raw ? JSON.parse(raw) : null, auth: String(req.headers.authorization) });
    res.end(JSON.stringify({ code: 0, data: { record: { record_id: 'recNEW', fields: {} } } }));
  });
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
process.env.LARK_API_BASE_FOR_TESTS = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
process.env.LARK_APP_ID = 'cli_test';
process.env.LARK_APP_SECRET = 'secret';
process.env.LARK_BASE_TOKEN = 'TESTBASE';
const { createRecord, updateRecord } = await import('../lib/lark/writes.ts');

test('create: POST records with fields, open_id users and a uuid client_token', async () => {
  const id = await createRecord('TESTBASE', 'tblA', { Task: 'X', 'Task Responsible': [{ id: 'ou_1' }], Department: ['C&I'] });
  assert.equal(id, 'recNEW');
  const r = seen.at(-1)!;
  assert.equal(r.method, 'POST');
  assert.equal(r.path, '/bitable/v1/apps/TESTBASE/tables/tblA/records');
  assert.equal(r.query.user_id_type, 'open_id');
  assert.match(r.query.client_token, /^[0-9a-f-]{36}$/);
  assert.deepEqual(r.body, { fields: { Task: 'X', 'Task Responsible': [{ id: 'ou_1' }], Department: ['C&I'] } });
  assert.equal(r.auth, 'Bearer t-mock');
});

test('update: PUT the one record with only the changed fields', async () => {
  await updateRecord('TESTBASE', 'tblA', 'rec9', { 'Task Status': 'Completed', 'Actual End Date': 1790000000000, 'Task summary': null });
  const r = seen.at(-1)!;
  assert.equal(r.method, 'PUT');
  assert.equal(r.path, '/bitable/v1/apps/TESTBASE/tables/tblA/records/rec9');
  assert.deepEqual(r.body, { fields: { 'Task Status': 'Completed', 'Actual End Date': 1790000000000, 'Task summary': null } });
  server.close();
});
