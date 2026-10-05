// Runs scripts/check-schema.ts end to end against a local mock of the Lark API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';

const sel = (names: string[]) => ({ options: names.map((name) => ({ name })) });
const taskFields = (statusOptions: string[]) => [
  { field_id: 'f1', field_name: 'Task', type: 1, is_primary: true },
  { field_id: 'f2', field_name: 'Task Responsible', type: 11 },
  { field_id: 'f3', field_name: 'Task Accountable', type: 11 },
  { field_id: 'f4', field_name: 'Task Support', type: 11 },
  { field_id: 'f5', field_name: 'Department', type: 4 },
  { field_id: 'f6', field_name: 'Departments', type: 4 },
  { field_id: 'f7', field_name: 'Start date', type: 5 },
  { field_id: 'f8', field_name: 'Estimate Deadline', type: 5 },
  { field_id: 'f9', field_name: 'Actual End Date', type: 5 },
  { field_id: 'f10', field_name: 'Priority', type: 3, property: sel(['Important', 'Normal']) },
  { field_id: 'f11', field_name: 'Progress notes', type: 1 },
  { field_id: 'f12', field_name: 'Task summary', type: 1 },
  { field_id: 'f13', field_name: 'PROJECT NAME (handover)', type: 18, property: { table_id: 'tbl5QmCHTiIgjUlE' } },
  { field_id: 'f14', field_name: 'Task Status', type: 3, property: sel(statusOptions) },
];
const projectFields = [
  { field_id: 'p1', field_name: 'PROJECT NAME', type: 1, is_primary: true },
  { field_id: 'p2', field_name: 'PROJECT TYPE', type: 3 },
  { field_id: 'p3', field_name: 'STATE', type: 3 },
  { field_id: 'p4', field_name: 'CAPACITY (kWp)', type: 2 },
  { field_id: 'p5', field_name: 'CURRENT CYCLE STATUS (O&M)', type: 3 },
];
const ALL_STATUS = ['Not yet started', 'Ongoing', 'O&M Stage', 'Stalled', 'Completed'];

function startMock(omStatus: string[]) {
  const seen: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    seen.push(`${req.method} ${url.pathname}${url.searchParams.get('page_token') ? '?page_token=' + url.searchParams.get('page_token') : ''}`);
    const send = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/auth/v3/tenant_access_token/internal') {
      return send({ code: 0, msg: 'ok', tenant_access_token: 't-test', expire: 7200 });
    }
    if (req.headers.authorization !== 'Bearer t-test') return send({ code: 99991663, msg: 'invalid token' });
    const m = url.pathname.match(/^\/bitable\/v1\/apps\/BASE\/tables(?:\/(\w+)\/fields)?$/);
    if (!m) return send({ code: 404, msg: 'not found' });
    if (!m[1]) {
      return send({
        code: 0,
        data: {
          has_more: false,
          items: [
            { table_id: 'tbllh9KcfhidHupv', name: '✅ (PH)Task Breakdown' },
            { table_id: 'tblG3imQ2abeqfC0', name: '✅ (O&M)Task Breakdown Copy' },
            { table_id: 'tbl5QmCHTiIgjUlE', name: 'O&M CNI HANDOVER,CONTACT INFO' },
          ],
        },
      });
    }
    const fields = m[1] === 'tbl5QmCHTiIgjUlE' ? projectFields : taskFields(m[1] === 'tblG3imQ2abeqfC0' ? omStatus : ALL_STATUS);
    // Two pages, to prove the client follows page_token.
    const second = url.searchParams.get('page_token') === 'p2';
    const half = Math.ceil(fields.length / 2);
    return send({
      code: 0,
      data: second
        ? { has_more: false, items: fields.slice(half) }
        : { has_more: true, page_token: 'p2', items: fields.slice(0, half) },
    });
  });
  return new Promise<{ base: string; seen: string[]; close: () => void }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ base: `http://127.0.0.1:${port}`, seen, close: () => server.close() });
    });
  });
}

async function run(omStatus: string[]) {
  const mock = await startMock(omStatus);
  const child = await new Promise<{ status: number | null; out: string }>((resolve) => {
    // spawnSync would block the mock server in this process, so run async.
    const p = spawn(process.execPath, ['scripts/check-schema.ts'], {
      env: {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
        LARK_APP_ID: 'cli_test',
        LARK_APP_SECRET: 'secret_should_never_print',
        LARK_BASE_TOKEN: 'BASE',
        LARK_API_BASE_FOR_TESTS: mock.base,
      },
    });
    let out = '';
    p.stdout.on('data', (d: Buffer) => (out += d));
    p.stderr.on('data', (d: Buffer) => (out += d));
    p.on('close', (status: number | null) => resolve({ status, out }));
  });
  mock.close();
  return { ...child, seen: mock.seen };
}

test('passes when the Base matches, following pagination', async () => {
  const r = await run(ALL_STATUS);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Schema check PASSED/);
  assert.ok(r.seen.includes('GET /bitable/v1/apps/BASE/tables/tblG3imQ2abeqfC0/fields?page_token=p2'));
  assert.doesNotMatch(r.out, /secret_should_never_print/);
});

test('fails and names the differing status option', async () => {
  const r = await run(['Not yet started', 'Ongoing', 'Stalled', 'Completed', 'On hold']);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /Task Status: Options missing in Lark: "O&M Stage"/);
  assert.match(r.out, /Extra options in Lark not handled by the app: "On hold"/);
});

test('exits 2 with a clear message when env vars are missing', () => {
  const r = spawnSync(process.execPath, ['scripts/check-schema.ts'], { env: { NODE_ENV: 'test', PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Missing environment variables: LARK_APP_ID, LARK_APP_SECRET, LARK_BASE_TOKEN/);
});
