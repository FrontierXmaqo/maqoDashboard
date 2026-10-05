// npm run check-schema
// Reads the field list of every configured Lark Base table and compares it with
// config/schema.ts. Read-only: it never writes to the Base.
// Exit codes: 0 = matches, 1 = mismatches found, 2 = could not run (config, auth, network).

import { runSchemaCheck } from '../lib/schema/run.ts';

const { exitCode, lines } = await runSchemaCheck();
(exitCode === 2 ? console.error : console.log)(lines.join('\n'));
process.exit(exitCode);
