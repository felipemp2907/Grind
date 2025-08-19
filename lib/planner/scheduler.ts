import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectTasksColumnMap } from '../db/tasksColumnMap';

function toLocalISODate(d: string) { return d; }

function isUuid(v: string | undefined): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
  const map = await detectTasksColumnMap(supa);

  // Insert scheduled today tasks with dynamic columns
  const { error: todayErr } = await supa
    .from('tasks')
    .insert(plan.schedule.map((t) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        goal_id: goalId,
        title: t.title,
        description: t.description,
        xp_value: t.xp,
        [map.dateCol]: toLocalISODate(t.dateISO) + 'T12:00:00.000Z',
        priority: goal.priority ?? 'medium',
      };
      if (map.isStreakCol) row[map.isStreakCol] = map.typeIsString ? 'today' : false;
      if (map.proofCol) row[map.proofCol] = true;
      if (map.tagsCol) row[map.tagsCol] = [];
      return row;
    }));
  if (todayErr) throw todayErr as any;

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes, goalId };
}
