// POST /api/tasks/update { id, changes }: edit a task. Leaders (own departments) and the CEO only.

import { NextResponse } from 'next/server';
import { assertSameOrigin, requireViewer } from '../../../../lib/auth/request';
import { updateTask } from '../../../../lib/tasks/service';
import { writeError } from '../../../../lib/tasks/http';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { viewer, snap } = await requireViewer();
    const body = (await req.json().catch(() => null)) as { id?: unknown; changes?: unknown } | null;
    if (!body || typeof body.id !== 'string' || !body.changes || typeof body.changes !== 'object') {
      return NextResponse.json({ error: 'Send { id, changes }.' }, { status: 400 });
    }
    await updateTask(viewer, snap, body.id, body.changes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return writeError(e);
  }
}
