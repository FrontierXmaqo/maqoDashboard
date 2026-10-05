'use client';

import { useState } from 'react';
import { DEPARTMENTS } from '../config/departments';

type P = { openId: string; name: string; dept: string | null };
type Role = 'ceo' | 'leader' | 'employee';

export function DevLoginForm({ people }: { people: P[] }) {
  const fallback: P = { openId: 'ou_dev_user', name: 'Dev user', dept: null };
  const list = people.length ? people : [fallback];
  const [role, setRole] = useState<Role>('ceo');
  const [who, setWho] = useState(list[0].openId);
  const [depts, setDepts] = useState<string[]>(['C&I', 'Engineering']);
  const [err, setErr] = useState('');
  const person = list.find((p) => p.openId === who) ?? list[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openId: person.openId, name: person.name, role, depts: role === 'leader' ? depts : person.dept ? [person.dept] : [] }),
    });
    if (res.ok) window.location.href = '/';
    else setErr(((await res.json().catch(() => ({}))) as { error?: string }).error || 'Could not sign in.');
  };

  return (
    <main className="main" style={{ maxWidth: 620, margin: '40px auto' }}>
      <form className="card" style={{ gap: 16 }} onSubmit={submit}>
        <div className="banner t-r" role="note"><b>DEV SIGN-IN.</b> Mock roles for testing. Not available in production.</div>
        <h1 className="title">Sign in as</h1>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ marginBottom: 6 }}>Role</legend>
          <div className="seg" role="group">
            {(['ceo', 'leader', 'employee'] as Role[]).map((r) => (
              <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
                {r === 'ceo' ? 'CEO' : r === 'leader' ? 'Leader' : 'Employee'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="dl-who">Person</label>
          <select id="dl-who" className="inp" value={who} onChange={(e) => setWho(e.target.value)}>
            {list.map((p) => (
              <option key={p.openId} value={p.openId}>{p.name}{p.dept ? ` (${p.dept})` : ' (department not set)'}</option>
            ))}
          </select>
          {role === 'employee' && <span className="help">An employee sees their own tasks and {person.dept ? `the ${person.dept} department` : 'no department (not set)'}.</span>}
        </div>
        {role === 'leader' && (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>Leads these departments</legend>
            <div className="row">
              {DEPARTMENTS.map((d) => (
                <label key={d} className="check">
                  <input type="checkbox" checked={depts.includes(d)} onChange={(e) => setDepts((x) => (e.target.checked ? [...x, d] : x.filter((y) => y !== d)))} />
                  {d}
                </label>
              ))}
            </div>
            <span className="help">Default: a division head leading C&amp;I and Engineering.</span>
          </fieldset>
        )}
        {err && <p className="err">{err}</p>}
        <div><button type="submit" className="btn primary">Sign in</button></div>
      </form>
    </main>
  );
}
