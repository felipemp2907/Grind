import { SupabaseClient } from '@supabase/supabase-js';

export type TaskTypeMapping =
  | { kind: 'json'; col: string }
  | { kind: 'text'; col: string }
  | { kind: 'bool'; col: string };

export type TaskColumnMap = {
  primaryDateCol: string;
  alsoSetDateCols: string[];
  timeCol?: string;
  typeMap?: TaskTypeMapping;
  proofCol?: string;
  tagsCol?: string;
};

async function columnExists(supa: SupabaseClient, col: string) {
  try {
    const { error } = await supa.from('tasks').select(col).limit(0);
    return !error;
  } catch (_e) {
    return false;
  }
}

async function findFirst(supa: SupabaseClient, candidates: string[], fallback: string) {
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) return c;
  }
  // eslint-disable-next-line no-return-await
  return (await columnExists(supa, fallback)) ? fallback : undefined;
}

export async function detectTasksColumnMap(supa: SupabaseClient): Promise<TaskColumnMap> {
  const datePriority = [
    'scheduled_for_date',
    'scheduled_for',
    'scheduled_at',
    'due_date',
    'due_at',
    'date',
    'planned_for_date',
    'planned_date',
  ];

  const primary = (await findFirst(supa, datePriority, 'scheduled_for_date')) || 'scheduled_for_date';

  const alsoSetDateCols: string[] = [];
  for (const c of datePriority) {
    // eslint-disable-next-line no-await-in-loop
    if (c !== primary && (await columnExists(supa, c))) alsoSetDateCols.push(c);
  }

  const timeCol = await findFirst(supa, ['scheduled_for_time', 'time', 'due_time'], '');
  const proofCol = await findFirst(supa, ['proof_required', 'requires_proof', 'require_proof', 'needs_proof'], '');
  const tagsCol = await findFirst(supa, ['tags', 'labels'], '');

  const typeMap: TaskTypeMapping | undefined = (await columnExists(supa, 'type'))
    ? { kind: 'json', col: 'type' }
    : (await columnExists(supa, 'task_type'))
    ? { kind: 'text', col: 'task_type' }
    : (await columnExists(supa, 'kind'))
    ? { kind: 'text', col: 'kind' }
    : (await columnExists(supa, 'is_streak'))
    ? { kind: 'bool', col: 'is_streak' }
    : (await columnExists(supa, 'streak'))
    ? { kind: 'bool', col: 'streak' }
    : undefined;

  return {
    primaryDateCol: primary,
    alsoSetDateCols,
    timeCol: timeCol || undefined,
    typeMap,
    proofCol: proofCol || undefined,
    tagsCol: tagsCol || undefined,
  };
}

export function setTaskType(row: Record<string, unknown>, map: TaskColumnMap, kind: 'today' | 'streak') {
  if (!map.typeMap) return;
  const { kind: t, col } = map.typeMap;
  if (t === 'json') row[col] = { kind };
  else if (t === 'text') row[col] = kind;
  else row[col] = kind === 'streak';
}

export function setTaskDates(row: Record<string, unknown>, map: TaskColumnMap, yyyyMmDd: string) {
  row[map.primaryDateCol] = yyyyMmDd;
  for (const extra of map.alsoSetDateCols) {
    row[extra] = yyyyMmDd;
  }
}

export function setTaskTimeIfNeeded(row: Record<string, unknown>, map: TaskColumnMap) {
  if (!map.timeCol) return;
  if (row[map.timeCol] == null) {
    row[map.timeCol] = '12:00:00';
  }
}

export function toLocalYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
