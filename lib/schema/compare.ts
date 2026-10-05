// Compares the fields Lark returns for a table with the fields the app expects.
// Pure function, no network, so it is unit-tested directly.

import { fieldTypeName, type ExpectedField } from '../../config/schema.ts';
import type { LarkField } from '../lark/bitable.ts';

export type Issue = {
  level: 'error' | 'warning' | 'info';
  field: string;
  message: string;
};

export type TableReport = {
  tableId: string;
  label: string;
  issues: Issue[];
  matched: { field: string; type: string }[];
  unmapped: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_()\-]+/g, '');

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Likely renamed field: same name ignoring case/spacing, or a small edit distance. */
function findRenameCandidate(name: string, candidates: LarkField[]): LarkField | undefined {
  const n = norm(name);
  const exactish = candidates.find((f) => norm(f.field_name) === n);
  if (exactish) return exactish;
  let best: { f: LarkField; d: number } | undefined;
  for (const f of candidates) {
    const d = editDistance(n, norm(f.field_name));
    if (d <= Math.max(2, Math.floor(n.length / 6)) && (!best || d < best.d)) best = { f, d };
  }
  return best?.f;
}

export function compareTable(
  tableId: string,
  label: string,
  expected: ExpectedField[],
  actual: LarkField[],
  ignored: string[] = [],
): TableReport {
  const issues: Issue[] = [];
  const matched: TableReport['matched'] = [];
  const byName = new Map(actual.map((f) => [f.field_name, f]));
  const expectedNames = new Set(expected.map((e) => e.name));
  const unclaimed = actual.filter((f) => !expectedNames.has(f.field_name) && !ignored.includes(f.field_name));
  const claimedByRename = new Set<string>();

  for (const exp of expected) {
    const f = byName.get(exp.name);
    if (!f) {
      const guess = findRenameCandidate(exp.name, unclaimed.filter((u) => !claimedByRename.has(u.field_name)));
      if (guess) {
        claimedByRename.add(guess.field_name);
        issues.push({
          level: 'error',
          field: exp.name,
          message: `Missing. Possibly renamed to "${guess.field_name}" (${fieldTypeName(guess.type)}).`,
        });
      } else {
        issues.push({
          level: exp.optional ? 'warning' : 'error',
          field: exp.name,
          message: exp.optional ? `Missing (optional${exp.note ? `, ${exp.note}` : ''}).` : 'Missing.',
        });
      }
      continue;
    }

    matched.push({ field: exp.name, type: fieldTypeName(f.type) });

    if (exp.types.length && !exp.types.includes(f.type)) {
      issues.push({
        level: 'error',
        field: exp.name,
        message: `Wrong type: expected ${exp.types.map(fieldTypeName).join(' or ')}, found ${fieldTypeName(f.type)}${f.ui_type ? ` (${f.ui_type})` : ''}.`,
      });
    }

    if (exp.options) {
      const found = (f.property?.options ?? []).map((o) => o.name);
      const missing = exp.options.filter((o) => !found.includes(o));
      const extra = found.filter((o) => !exp.options!.includes(o));
      if (missing.length) {
        issues.push({
          level: 'error',
          field: exp.name,
          message: `Options missing in Lark: ${missing.map((o) => `"${o}"`).join(', ')}. Lark has: ${found.map((o) => `"${o}"`).join(', ') || 'none'}.`,
        });
      }
      if (extra.length) {
        issues.push({
          level: 'warning',
          field: exp.name,
          message: `Extra options in Lark not handled by the app: ${extra.map((o) => `"${o}"`).join(', ')}.`,
        });
      }
    }

    if (exp.linkTable) {
      const target = f.property?.table_id;
      if (target && target !== exp.linkTable) {
        issues.push({
          level: 'error',
          field: exp.name,
          message: `Links to table ${target}${f.property?.table_name ? ` ("${f.property.table_name}")` : ''}, expected ${exp.linkTable}.`,
        });
      } else if (!target) {
        issues.push({ level: 'warning', field: exp.name, message: 'Linked table not reported by Lark; could not verify.' });
      }
    }
  }

  const unmapped = unclaimed.filter((f) => !claimedByRename.has(f.field_name)).map((f) => f.field_name);
  return { tableId, label, issues, matched, unmapped };
}
