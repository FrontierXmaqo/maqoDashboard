// Maps write errors to HTTP responses with a message a person can act on.

import { NextResponse } from 'next/server';
import { HttpError } from '../auth/request.ts';
import { SessionConfigError } from '../auth/session.ts';
import { LarkApiError } from '../lark/client.ts';
import { InvalidInput } from './validate.ts';

export function writeError(e: unknown): NextResponse {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof InvalidInput) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof SessionConfigError) return NextResponse.json({ error: 'Sign-in is not configured on this deployment.' }, { status: 503 });
  if (e instanceof LarkApiError) {
    console.error('Lark write failed:', e);
    return NextResponse.json({ error: `Lark rejected the change (code ${e.code}). Nothing was saved.` }, { status: 502 });
  }
  console.error('Write failed:', e);
  return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
}
