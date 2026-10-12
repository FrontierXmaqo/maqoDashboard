// Lark "TooManyRequest" (1254290) is retried with a short wait instead of failing the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

let calls = 0;
let failFirst = 2;
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url?.startsWith('/auth/')) return res.end(JSON.stringify({ code: 0, tenant_access_token: 't', expire: 7200 }));
  calls++;
  if (calls <= failFirst) return res.end(JSON.stringify({ code: 1254290, msg: 'TooManyRequest' }));
  res.end(JSON.stringify({ code: 0, data: { ok: true } }));
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
process.env.LARK_API_BASE_FOR_TESTS = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
process.env.LARK_APP_ID = 'cli_test';
process.env.LARK_APP_SECRET = 'secret';
const { larkRequest, LarkApiError } = await import('../lib/lark/client.ts');

test('rate-limited calls succeed after retrying', async () => {
  assert.deepEqual(await larkRequest('GET', '/x'), { ok: true });
  assert.equal(calls, 3);
});

test('gives up with the Lark error after the retries run out', async () => {
  calls = 0;
  failFirst = 99;
  await assert.rejects(larkRequest('GET', '/x'), (e: unknown) => e instanceof LarkApiError && e.code === 1254290);
  assert.equal(calls, 5);
  server.close();
});
