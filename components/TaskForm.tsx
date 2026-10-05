'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from './DataProvider';
import { Avatar, Icon } from './ui';
import { dayToIso, klDay } from '../lib/dates';
import { creatableDepartments } from '../lib/auth/permissions';
import { TASK_STATUS_OPTIONS } from '../config/schema';
import type { TaskX, Tone } from '../lib/model';

const STATUS_TONE: Record<string, Tone> = { 'Not yet started': 'n', Ongoing: 'b', 'O&M Stage': 'b', Stalled: 'r', Completed: 'g' };

export type NewPreset = { assignee?: string; due?: string; department?: string };

type Form = { title: string; status: string; assignees: string[]; support: string[]; start: string; due: string; priority: string; notes: string; summary: string; department: string };

function PeoplePicker({ id, label, value, onChange, options, help }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void; options: { openId: string; name: string; hint: string }[]; help?: string }) {
  const { M } = useData();
  const nameOf = (oid: string) => M.personById.get(oid)?.name ?? options.find((o) => o.openId === oid)?.name ?? 'Unknown person';
  const rest = options.filter((o) => !value.includes(o.openId));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {value.length > 0 && (
        <div className="chips">
          {value.map((oid) => (
            <span key={oid} className="chip" style={{ paddingRight: 4 }}>
              <Avatar p={{ name: nameOf(oid), avatarUrl: M.personById.get(oid)?.avatarUrl ?? null }} sm />
              {nameOf(oid)}
              <button type="button" className="icon-btn" style={{ width: 26, height: 26, border: 0 }} aria-label={`Remove ${nameOf(oid)}`} onClick={() => onChange(value.filter((x) => x !== oid))}>
                <Icon n="x" s={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <select id={id} className="inp" value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
        <option value="">{value.length ? 'Add another person…' : 'Choose a person…'}</option>
        {rest.map((o) => (
          <option key={o.openId} value={o.openId}>{o.name} ({o.hint})</option>
        ))}
      </select>
      {help && <span className="help">{help}</span>}
    </div>
  );
}

export function TaskForm({ task, preset }: { task?: TaskX; preset?: NewPreset }) {
  const { M, close, toast } = useData();
  const router = useRouter();
  const depts = creatableDepartments(M.viewer);
  // New task department: the preset, else the chosen assignee's department, else the first allowed.
  const assigneeDept = M.personById.get(preset?.assignee ?? '')?.dept ?? '';
  const defaultDept = [preset?.department ?? '', assigneeDept].find((d) => d && depts.includes(d)) ?? depts[0] ?? '';
  const initial: Form = useMemo(
    () =>
      task
        ? {
            title: task.title === 'Untitled task' && !task.statusRaw ? '' : task.title,
            status: task.statusRaw && TASK_STATUS_OPTIONS.includes(task.statusRaw) ? task.statusRaw : '',
            assignees: task.assignees.map((a) => a.openId),
            support: task.support.map((a) => a.openId),
            start: Number.isFinite(klDay(task.start)) ? dayToIso(klDay(task.start)) : '',
            due: Number.isFinite(task.dueDay) ? dayToIso(task.dueDay) : '',
            priority: task.priority === 'high' ? 'Important' : task.priority === 'normal' ? 'Normal' : '',
            notes: task.notes,
            summary: task.summary,
            department: '',
          }
        : {
            title: '',
            status: 'Not yet started',
            assignees: preset?.assignee ? [preset.assignee] : [],
            support: [],
            start: dayToIso(M.t0),
            due: preset?.due ?? dayToIso(M.t0 + 7),
            priority: 'Normal',
            notes: '',
            summary: '',
            department: defaultDept,
          },
    [task, preset, M, defaultDept],
  );
  const [f, setF] = useState<Form>(initial);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  // Responsible: the CEO can pick anyone; a leader picks people in their departments.
  const assignable = M.sPeople
    .filter((p) => M.viewer.role === 'ceo' || (p.dept != null && M.viewer.depts.includes(p.dept)))
    .sort((a, b) => a.n - b.n || a.name.localeCompare(b.name))
    .map((p) => ({ openId: p.openId, name: p.name, hint: `${p.deptLabel}, ${p.n === 0 ? 'free' : `${p.n} open`}` }));
  const everyone = M.sPeople.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ openId: p.openId, name: p.name, hint: p.deptLabel }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!f.title.trim()) return setErr('Give the task a name.');
    if (!f.status) return setErr('Pick a status.');
    if (f.start && f.due && f.due < f.start) return setErr('The deadline is before the start date.');
    const changes: Record<string, unknown> = {};
    (Object.keys(f) as (keyof Form)[]).forEach((k) => {
      if (k === 'department') return;
      if (JSON.stringify(f[k]) !== JSON.stringify(initial[k])) changes[k] = f[k];
    });
    if (task && !Object.keys(changes).length) return close();
    setSaving(true);
    const res = await fetch(task ? '/api/tasks/update' : '/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task ? { id: task.id, changes } : { ...f, department: f.department }),
    }).catch(() => null);
    setSaving(false);
    const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!res || !res.ok) return setErr(body?.error || 'Could not save. Check your connection and try again.');
    toast(task ? `Saved “${f.title.trim()}” to Lark` : `Created “${f.title.trim()}” in Lark`);
    close();
    router.refresh();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tf-h">
      <div className="spread">
        <h2 id="tf-h" style={{ fontSize: 15 }}>{task ? 'Edit task' : 'New task'}</h2>
        <button type="button" className="icon-btn" onClick={close} aria-label="Close"><Icon n="x" s={16} /></button>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        {!task && (
          <div className="field">
            <label htmlFor="tf-dept">Department</label>
            <select id="tf-dept" className="inp" value={f.department} onChange={(e) => set('department', e.target.value)}>
              {depts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="help">Set once when the task is created. Saved to the {f.department === 'O&M' ? 'O&M' : 'PH'} task table.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="tf-title">Task</label>
          <input id="tf-title" className="inp" maxLength={300} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Inverter health check, Shah Alam" />
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ marginBottom: 6 }}>Status</legend>
          <div className="stagepick" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))' }}>
            {TASK_STATUS_OPTIONS.map((s) => (
              <label key={s} className="stageopt">
                <input type="radio" name="status" value={s} checked={f.status === s} onChange={() => set('status', s)} />
                <span className={`dot d-${STATUS_TONE[s]}`} />
                {s}
              </label>
            ))}
          </div>
          {task && !f.status && <span className="help">Status is not set in Lark. Pick one to save.</span>}
          {f.status === 'Completed' && initial.status !== 'Completed' && <span className="help">Actual End Date will be set to now.</span>}
        </fieldset>
        <PeoplePicker id="tf-resp" label="Task Responsible" value={f.assignees} onChange={(v) => set('assignees', v)} options={assignable} help="Counts toward their workload. Sorted by fewest open tasks." />
        <PeoplePicker id="tf-sup" label="Task Support" value={f.support} onChange={(v) => set('support', v)} options={everyone} help="Shown on the task. Doesn’t count toward workload." />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="tf-start">Start date</label>
            <input id="tf-start" className="inp" type="date" value={f.start} onChange={(e) => set('start', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tf-due">Deadline</label>
            <input id="tf-due" className="inp" type="date" value={f.due} onChange={(e) => set('due', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tf-prio">Priority</label>
            <select id="tf-prio" className="inp" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="">Not set</option>
              <option value="Important">Important</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="tf-sum">Task summary</label>
          <textarea id="tf-sum" className="inp" maxLength={10000} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tf-notes">Progress notes</label>
          <textarea id="tf-notes" className="inp" maxLength={10000} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        {task && <p className="muted">Project, departments and the Lark table can only be changed in Lark. Saved to: {task.sourceLabel}.</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving to Lark…' : task ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </div>
  );
}
