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

// Try multiple common constraint patterns for task types
const TASK_TYPE_PATTERNS = {
  // Pattern 1: today/daily
  pattern1: { scheduled: 'today', streak: 'daily' },
  // Pattern 2: scheduled/recurring  
  pattern2: { scheduled: 'scheduled', streak: 'recurring' },
  // Pattern 3: one_time/habit
  pattern3: { scheduled: 'one_time', streak: 'habit' },
  // Pattern 4: task/streak
  pattern4: { scheduled: 'task', streak: 'streak' },
};

export function applyTaskType(row: Record<string, unknown>, typeMap: TaskTypeMapping | undefined, logicalKind: 'today'|'scheduled'|'streak', pattern: keyof typeof TASK_TYPE_PATTERNS = 'pattern1') {
  if (!typeMap) return;
  
  // Map logical kinds to database-expected values based on pattern
  const patternMap = TASK_TYPE_PATTERNS[pattern];
  let dbValue: string;
  if (logicalKind === 'scheduled') {
    dbValue = patternMap.scheduled;
  } else if (logicalKind === 'streak') {
    dbValue = patternMap.streak;
  } else {
    dbValue = 'today'; // fallback for 'today'
  }
  
  if (typeMap.kind === 'json') {
    row[typeMap.col] = { kind: dbValue };
  } else if (typeMap.kind === 'text') {
    row[typeMap.col] = dbValue;
  } else {
    // For boolean columns, true = streak, false = scheduled/today
    row[typeMap.col] = (logicalKind === 'streak');
  }
}

// Helper function to try inserting with different patterns
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

  const patterns = Object.keys(TASK_TYPE_PATTERNS) as (keyof typeof TASK_TYPE_PATTERNS)[];
  
  for (const pattern of patterns) {
    const testRows = rows.map(row => {
      const newRow = { ...row };
      applyTaskType(newRow, typeMap, logicalKind, pattern);
      return newRow;
    });
    
    const { error } = await supa.from('tasks').insert(testRows);
    if (!error) {
      return { error: null }; // Success
    }
    
    // If this is a constraint error, try next pattern
    if (error.message?.includes('check constraint') || error.message?.includes('violates')) {
      console.log(`Pattern ${pattern} failed, trying next:`, error.message);
      continue;
    }
    
    // If it's not a constraint error, return the error
    return { error };
  }
  
  // All patterns failed
  return { error: new Error('All task type patterns failed constraint validation') };
}
