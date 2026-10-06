import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchTable } from '../lib/data/sources.ts';
import { larkEnv, usingTestBase } from '../lib/lark/env.ts';

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const before = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(before)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
}

const base = { LARK_APP_ID: 'id', LARK_APP_SECRET: 'secret', LARK_BASE_TOKEN: 'live', LARK_BASE_TOKEN_TEST: 'test' };

test('previews read the test Base; production never does', () => {
  withEnv({ ...base, VERCEL_ENV: 'preview' }, () => {
    assert.equal(usingTestBase(), true);
    assert.equal(larkEnv().baseToken, 'test');
  });
  withEnv({ ...base, VERCEL_ENV: 'production' }, () => {
    assert.equal(usingTestBase(), false);
    assert.equal(larkEnv().baseToken, 'live');
  });
  withEnv({ ...base, VERCEL_ENV: 'preview', LARK_BASE_TOKEN_TEST: undefined }, () => {
    assert.equal(larkEnv().baseToken, 'live');
  });
});

test('copied tables are found by ID, else by name', () => {
  const src = { tableId: 'tblLive', label: '(PH) Task Breakdown' };
  assert.equal(matchTable(src, [{ table_id: 'tblLive', name: 'renamed' }]).tableId, 'tblLive');
  assert.equal(matchTable(src, [{ table_id: 'tblCopy', name: '(PH)Task Breakdown' }]).tableId, 'tblCopy');
  assert.equal(matchTable(src, [{ table_id: 'tblOther', name: 'Something else' }]).tableId, 'tblLive');
});
