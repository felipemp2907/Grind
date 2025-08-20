import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectTasksColumnMap, TaskColumnMap, insertTasksWithFallback } from '../db/tasksColumnMap';

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
  const map: TaskColumnMap = await detectTasksColumnMap(supa);
  const primaryDateCol = map.dateCol;

  // Insert TODAY tasks with fallback pattern matching
  const todayRows = plan.schedule.map((t) => {
    const isoDate = toLocalISODate(t.dateISO);
    const row: Record<string, unknown> = {
      user_id: userId,
      goal_id: goalId,
      title: t.title,
      description: t.description,
      xp_value: t.xp ?? 0,
      [primaryDateCol]: isoDate,
    };
    if (map.sourceCol) row[map.sourceCol] = 'client_planner_v2';
    if (map.proofCol) row[map.proofCol] = t.proofRequired;
    if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
    return row;
  });
  const { error: todayErr } = await insertTasksWithFallback(supa, todayRows, map.typeMap, 'scheduled');
  if (todayErr) throw todayErr as any;

  // Insert STREAK tasks as daily rows up to a safe horizon (<=120 days)
  const start = new Date(goal.createdAtISO);
  const end = new Date(goal.deadlineISO);
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const horizonDays = Math.min(diffDays, 120);
  const streakRows: Record<string, unknown>[] = [];
  for (let d = 0; d < horizonDays; d++) {
    const day = new Date(start.getTime() + d * 86400000).toISOString().slice(0, 10);
    for (const s of plan.streaks) {
      const r: Record<string, unknown> = {
        user_id: userId,
        goal_id: goalId,
        title: s.title,
        description: s.description,
        xp_value: s.xp ?? 0,
        [primaryDateCol]: day,
      };
      if (map.sourceCol) r[map.sourceCol] = 'client_planner_v2';
      if (map.proofCol) r[map.proofCol] = s.proofRequired;
      streakRows.push(r);
    }
  }
  if (streakRows.length) {
    const { error: streakErr } = await insertTasksWithFallback(supa, streakRows, map.typeMap, 'streak');
    if (streakErr) throw streakErr as any;
  }

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes, goalId };
}
