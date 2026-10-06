import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveViewer, scopeSnapshot, type RoleConfig } from '../lib/auth/viewer.ts';
import { mapTask } from '../lib/data/mapTask.ts';
import type { Snapshot } from '../lib/types.ts';

process.env.SESSION_SECRET = 'x'.repeat(40);
const { encodeSession, decodeSession } = await import('../lib/auth/session.ts');

const CFG: RoleConfig = { ceo: ['ou_ceo'], leaders: [{ openId: 'ou_div', departments: ['C&I', 'Engineering'] }] };

test('roles: CEO, division head with two departments, everyone else employee', () => {
  assert.deepEqual(resolveViewer('ou_ceo', 'CEO Office', undefined, CFG), { role: 'ceo', openId: 'ou_ceo', depts: [] });
  assert.deepEqual(resolveViewer('ou_div', 'C&I', undefined, CFG), { role: 'leader', openId: 'ou_div', depts: ['C&I', 'Engineering'] });
  assert.deepEqual(resolveViewer('ou_x', 'O&M', undefined, CFG), { role: 'employee', openId: 'ou_x', depts: ['O&M'] });
  assert.deepEqual(resolveViewer('ou_y', null, undefined, CFG), { role: 'employee', openId: 'ou_y', depts: [] });
});

const P = (openId: string, dept: string | null) => ({ openId, name: openId, avatarUrl: null, jobTitle: '', dept, larkDepartments: [], source: 'contacts' as const });
const base = mapTask({ record_id: 'x', fields: {} }, { tableId: 't', label: 't' });
const u = (id: string) => ({ openId: id, name: id, avatarUrl: null });
const snap: Snapshot = {
  generatedAt: 0,
  tasks: [
    { ...base, id: 'ci', departments: ['C&I'], assignees: [u('ou_e1')], projectIds: ['p1'], stage: 'ongoing' },
    { ...base, id: 'eng', departments: ['Engineering'], assignees: [u('ou_e2')], stage: 'todo' },
    { ...base, id: 'om', departments: ['O&M'], assignees: [u('ou_e1')], projectIds: ['p2'], stage: 'ongoing' },
    { ...base, id: 'mine', departments: [], assignees: [u('ou_e3')], stage: 'notset' },
  ],
  projects: [{ id: 'p1', name: 'P1', type: '', state: '', capacity: '', cycleStatus: '' }, { id: 'p2', name: 'P2', type: '', state: '', capacity: '', cycleStatus: '' }],
  people: [P('ou_e1', 'C&I'), P('ou_e2', 'Engineering'), P('ou_e3', 'O&M'), P('ou_ceo', 'CEO Office')],
  departmentMap: [{ lark: 'x', app: null }],
  skippedTables: [],
  sources: [{ tableId: 't', label: 't', count: 4 }],
  warnings: [],
  freeThreshold: 3,
  overloadedAt: 5,
  writesEnabled: false,
    duplicatesSkipped: 0,
    hiddenTasks: 0,
};

test('scope: leader sees both led departments only, with true workload totals', () => {
  const s = scopeSnapshot(snap, { role: 'leader', openId: 'ou_div', depts: ['C&I', 'Engineering'] });
  assert.deepEqual(s.tasks.map((t) => t.id), ['ci', 'eng']);
  assert.deepEqual(s.people.map((p) => p.openId), ['ou_e1', 'ou_e2']);
  assert.equal(s.people[0].openTotal, 2); // includes the O&M task the leader cannot see
  assert.deepEqual(s.projects.map((p) => p.id), ['p1']);
  assert.deepEqual(s.departmentMap, []);
});

test('scope: employee sees own tasks plus own department', () => {
  const s = scopeSnapshot(snap, { role: 'employee', openId: 'ou_e3', depts: ['O&M'] });
  assert.deepEqual(s.tasks.map((t) => t.id), ['om', 'mine']);
  assert.deepEqual(s.people.map((p) => p.openId), ['ou_e3']);
});

test('scope: CEO sees everything unchanged', () => {
  assert.equal(scopeSnapshot(snap, { role: 'ceo', openId: 'ou_ceo', depts: [] }), snap);
});

test('session: round-trips, rejects tampering and expiry', () => {
  const raw = encodeSession({ openId: 'ou_1', name: 'A', avatarUrl: null });
  assert.equal(decodeSession(raw)?.openId, 'ou_1');
  const [body, sig] = raw.split('.');
  const forged = Buffer.from(JSON.stringify({ openId: 'ou_ceo', name: 'X', avatarUrl: null, exp: 9e9 })).toString('base64url');
  assert.equal(decodeSession(`${forged}.${sig}`), null);
  assert.equal(decodeSession(`${body}.x${sig.slice(1)}`), null);
  assert.equal(decodeSession(encodeSession({ openId: 'ou_1', name: 'A', avatarUrl: null }, -10)), null);
  assert.equal(decodeSession(undefined), null);
});
