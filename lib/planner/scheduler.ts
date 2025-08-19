import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectTasksColumnMap, TaskColumnMap } from '../db/tasksColumnMap';

function toLocalISODate(d: string) { return d; }

function isUuid(v: string | undefined): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function columnExists(supa: SupabaseClient, col: string) {
  try {
    const { error } = await supa.from('tasks').select(col).limit(0);
    return !error;
  } catch {
    return false;
  }
}

export async function planAndInsertAll(goal: GoalInput, supa: SupabaseClient, userId: string) {
  console.log('planAndInsertAll: start', { goalTitle: goal.title, userId });
  const plan: PlanResult = chooseBlueprint(goal);
  console.log('planAndInsertAll: blueprint chosen', plan.notes);

  // Ensure goal exists and get a valid UUID id
  let goalId: string | undefined = isUuid(goal.id) ? goal.id : undefined;

  if (!goalId) {
    const { data: inserted, error: insertErr } = await supa
      .from('goals')
      .insert({ user_id: userId, title: goal.title, description: goal.description ?? '', deadline: goal.deadlineISO })
      .select('id')
      .single();
    if (insertErr) throw insertErr as any;
    goalId = inserted?.id as string;
  } else {
    const { error: upErr } = await supa
      .from('goals')
      .upsert({ id: goalId, user_id: userId, title: goal.title, description: goal.description ?? '', deadline: goal.deadlineISO }, { onConflict: 'id' });
    if (upErr) throw upErr as any;
  }

  // Insert streak definitions if table exists; ignore failure if not
  try {
    const { error: streakErr } = await supa
      .from('streak_task_defs')
      .insert(plan.streaks.map((s) => ({
        user_id: userId,
        goal_id: goalId,
        title: s.title,
        description: s.description,
        xp: s.xp,
        proof_required: s.proofRequired,
      })));
    if (streakErr) console.log('streak_task_defs insert skipped/failed:', (streakErr as any)?.message ?? streakErr);
  } catch (e:any) {
    console.log('streak_task_defs table missing or insert failed (non-fatal):', e?.message || e);
  }

  // Detect flexible column names on tasks table
  const map: TaskColumnMap = await detectTasksColumnMap(supa);
  const allDateCols = ['scheduled_for_date','scheduled_for','due_date','date','due_at','dueOn','due'];
  const availableDateCols: string[] = [];
  for (const c of allDateCols) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) availableDateCols.push(c);
  }
  const primaryDateCol = map.dateCol;

  const { error: todayErr } = await supa
    .from('tasks')
    .insert(plan.schedule.map((t) => {
      const isoDate = toLocalISODate(t.dateISO);
      const row: Record<string, unknown> = {
        user_id: userId,
        goal_id: goalId,
        title: t.title,
        description: t.description,
        xp_value: t.xp ?? 0,
      };
      row[primaryDateCol] = isoDate;
      for (const c of availableDateCols) {
        row[c] = isoDate;
      }
      if (map.isStreakCol) {
        if (map.typeIsString) row[map.isStreakCol] = 'today';
        else if ((map as any).typeIsJSON) {
          // leave unset to allow DB default/trigger to populate valid shape
        } else row[map.isStreakCol] = false;
      }
      if (map.proofCol) row[map.proofCol] = true;
      if (map.tagsCol) row[map.tagsCol] = [];
      return row;
    }));
  if (todayErr) throw todayErr as any;

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes, goalId };
}
