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
  // Check for the specific constraint pattern: streak tasks use task_date, today tasks use due_at
  const hasTaskDate = await columnExists(supa, 'task_date');
  const hasDueAt = await columnExists(supa, 'due_at');
  const hasType = await columnExists(supa, 'type');
  
  // If we have the constraint pattern columns, use them
  if (hasTaskDate && hasDueAt && hasType) {
    return {
      dateCol: 'due_at', // Default for today tasks
      typeMap: { kind: 'text', col: 'type' },
      proofCol: await anyOf(supa, ['proof_required','requires_proof','require_proof','needs_proof']),
      tagsCol: await anyOf(supa, ['tags','labels']),
      sourceCol: await anyOf(supa, ['source','task_source','origin']),
    };
  }

  // Fallback to original detection logic
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

export function applyTaskType(
  row: Record<string, unknown>, 
  typeMap: TaskTypeMapping | undefined, 
  logicalKind: 'today'|'scheduled'|'streak',
  dateValue: string
) {
  if (!typeMap) return;
  
  // Set the type field
  if (typeMap.kind === 'json') {
    row[typeMap.col] = { kind: logicalKind === 'scheduled' ? 'today' : logicalKind };
  } else if (typeMap.kind === 'text') {
    row[typeMap.col] = logicalKind === 'scheduled' ? 'today' : logicalKind;
  } else {
    // For boolean columns, true = streak, false = scheduled/today
    row[typeMap.col] = (logicalKind === 'streak');
  }
  
  // Apply the constraint pattern: streak tasks use task_date, today tasks use due_at
  if (logicalKind === 'streak') {
    row['task_date'] = dateValue;
    // Ensure due_at is null for streak tasks
    if ('due_at' in row) delete row['due_at'];
  } else {
    // For 'today' or 'scheduled' tasks
    row['due_at'] = dateValue + 'T23:59:59.999Z'; // Convert to timestamp
    // Ensure task_date is null for today tasks
    if ('task_date' in row) delete row['task_date'];
  }
}

// Helper function to insert tasks with proper constraint handling
export async function insertTasksWithFallback(
  supa: SupabaseClient,
  rows: Record<string, unknown>[],
  typeMap: TaskTypeMapping | undefined,
  logicalKind: 'today'|'scheduled'|'streak'
) {
  if (!typeMap) {
    // No type mapping, insert as-is
    return await supa.from('tasks').insert(rows);
  }

  // Apply the constraint pattern to all rows
  const processedRows = rows.map(row => {
    const newRow = { ...row };
    const dateValue = (newRow.dateValue as string) || new Date().toISOString().slice(0, 10);
    // Remove the temporary dateValue field
    delete newRow.dateValue;
    applyTaskType(newRow, typeMap, logicalKind, dateValue);
    return newRow;
  });
  
  const { error } = await supa.from('tasks').insert(processedRows);
  return { error };
}
