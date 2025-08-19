import { SupabaseClient } from '@supabase/supabase-js';

export type TaskTypeMapping =
  | { kind: 'json'; col: string }
  | { kind: 'text'; col: string }
  | { kind: 'bool'; col: string };

export type TaskColumnMap = {
  dateCol: string;
  typeMap?: TaskTypeMapping;
  proofCol?: string;
  tagsCol?: string;
  sourceCol?: string;
};

async function columnExists(supa: SupabaseClient, col: string) {
  try {
    const { error } = await supa.from('tasks').select(col).limit(0);
    return !error;
  } catch (e) {
    return false;
  }
}

async function anyOf(supa: SupabaseClient, cols: string[]) {
  for (const c of cols) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) return c;
  }
  return undefined;
}

export async function detectTasksColumnMap(
  supa: SupabaseClient,
): Promise<TaskColumnMap> {
  const dateCandidates = ['scheduled_for_date', 'scheduled_for', 'due_date', 'date', 'due_at', 'dueOn', 'due'];
  let dateCol = 'due_date';
  for (const c of dateCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) { dateCol = c; break; }
  }

  // Prefer JSONB type column commonly named 'type'
  const jsonCandidates = ['type'];
  for (const c of jsonCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) {
      return {
        dateCol,
        typeMap: { kind: 'json', col: c },
        proofCol: await anyOf(supa, ['proof_required','requires_proof','require_proof','needs_proof']),
        tagsCol: await anyOf(supa, ['tags','labels']),
        sourceCol: await anyOf(supa, ['source','task_source','origin']),
      };
    }
  }

  const textCandidates = ['type','task_type','kind'];
  for (const c of textCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) {
      return {
        dateCol,
        typeMap: { kind: 'text', col: c },
        proofCol: await anyOf(supa, ['proof_required','requires_proof','require_proof','needs_proof']),
        tagsCol: await anyOf(supa, ['tags','labels']),
        sourceCol: await anyOf(supa, ['source','task_source','origin']),
      };
    }
  }

  const boolCandidates = ['is_streak','streak','is_recurring','recurring'];
  for (const c of boolCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) {
      return {
        dateCol,
        typeMap: { kind: 'bool', col: c },
        proofCol: await anyOf(supa, ['proof_required','requires_proof','require_proof','needs_proof']),
        tagsCol: await anyOf(supa, ['tags','labels']),
        sourceCol: await anyOf(supa, ['source','task_source','origin']),
      };
    }
  }

  return {
    dateCol,
    proofCol: await anyOf(supa, ['proof_required','requires_proof','require_proof','needs_proof']),
    tagsCol: await anyOf(supa, ['tags','labels']),
    sourceCol: await anyOf(supa, ['source','task_source','origin']),
  };
}

export function applyTaskType(row: Record<string, unknown>, typeMap: TaskTypeMapping | undefined, logicalKind: 'today'|'streak') {
  if (!typeMap) return;
  if (typeMap.kind === 'json') {
    row[typeMap.col] = { kind: logicalKind };
  } else if (typeMap.kind === 'text') {
    row[typeMap.col] = logicalKind;
  } else {
    row[typeMap.col] = (logicalKind === 'streak');
  }
}
