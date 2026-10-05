// POST /api/tasks: create a task. Leaders (own departments) and the CEO only.

import { NextResponse } from 'next/server';
import { assertSameOrigin, requireViewer } from '../../../lib/auth/request';
import { createTask } from '../../../lib/tasks/service';
import { writeError } from '../../../lib/tasks/http';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { viewer, snap } = await requireViewer();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Send the task as JSON.' }, { status: 400 });
    return NextResponse.json(await createTask(viewer, snap, body));
  } catch (e) {
    return writeError(e);
  }
}
