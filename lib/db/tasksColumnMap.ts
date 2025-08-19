import { SupabaseClient } from '@supabase/supabase-js';

export type TaskColumnMap = {
  dateCol: string;
  isStreakCol?: string;
  proofCol?: string;
  tagsCol?: string;
  typeIsString?: boolean;
};

async function columnExists(supa: SupabaseClient, col: string) {
  try {
    const { error } = await supa.from('tasks').select(col).limit(0);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function detectTasksColumnMap(
  supa: SupabaseClient,
  envOverride?: Partial<TaskColumnMap>
): Promise<TaskColumnMap> {
  const tryCols = (cands: string[], fallback: string) =>
    cands.includes(fallback) ? cands : [fallback, ...cands];

  const dateCandidates = tryCols(
    ['due_date', 'date', 'due_at', 'scheduled_for', 'dueOn', 'due'],
    envOverride?.dateCol || 'due_date'
  );
  let dateCol = 'due_date';
  for (const c of dateCandidates) {
    if (await columnExists(supa, c)) {
      dateCol = c;
      break;
    }
  }

  const streakCandidates = ['is_streak', 'streak', 'is_recurring', 'recurring', 'task_type', 'is_habit'];
  let isStreakCol: string | undefined;
  let typeIsString = false;
  for (const c of streakCandidates) {
    if (await columnExists(supa, c)) {
      isStreakCol = c;
      typeIsString = c === 'task_type';
      break;
    }
  }

  const proofCandidates = ['proof_required', 'requires_proof', 'require_proof', 'needs_proof'];
  let proofCol: string | undefined;
  for (const c of proofCandidates) {
    if (await columnExists(supa, c)) {
      proofCol = c;
      break;
    }
  }

  const tagCandidates = ['tags', 'labels'];
  let tagsCol: string | undefined;
  for (const c of tagCandidates) {
    if (await columnExists(supa, c)) {
      tagsCol = c;
      break;
    }
  }

  return { dateCol, isStreakCol, proofCol, tagsCol, typeIsString };
}
