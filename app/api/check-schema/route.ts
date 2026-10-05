// GET /api/check-schema: the same read-only report as `npm run check-schema`, as plain text.
// Turned off on production deployments. Preview deployments sit behind Vercel Authentication.

import { runSchemaCheck } from '../../../lib/schema/run.ts';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  const { exitCode, lines } = await runSchemaCheck();
  return new Response(`${lines.join('\n')}\n\nExit code: ${exitCode}\n`, {
    status: exitCode === 2 ? 503 : 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
