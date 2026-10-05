// Drops rows that repeat a row from an earlier task table. The O&M table started as a copy
// of the PH table, so identical rows would otherwise count twice. A row is a duplicate when
// title, status, deadline and Task Responsible all match; the earlier table's row is kept.
// Once a copied row is edited it no longer matches and both rows count.

import type { Task } from '../types.ts';

const signature = (t: Task) =>
  JSON.stringify([t.title.trim().toLowerCase(), t.statusRaw ?? '', t.due ?? '', t.assignees.map((a) => a.openId).sort()]);

export function dropCrossTableDuplicates(tasksBySource: Task[][]): { tasks: Task[]; skipped: number } {
  const seen = new Set<string>();
  const tasks: Task[] = [];
  let skipped = 0;
  tasksBySource.forEach((list, i) => {
    const mine = new Set<string>();
    for (const t of list) {
      const sig = signature(t);
      if (i > 0 && seen.has(sig)) {
        skipped++;
        continue;
      }
      mine.add(sig);
      tasks.push(t);
    }
    mine.forEach((s) => seen.add(s));
  });
  return { tasks, skipped };
}
