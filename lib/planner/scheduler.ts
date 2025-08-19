import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';

function toLocalISODate(d: string) { return d; }

export async function planAndInsertAll(goal: GoalInput, supa: SupabaseClient, userId: string) {
  console.log('planAndInsertAll: start', { goalTitle: goal.title, userId });
  const plan: PlanResult = chooseBlueprint(goal);
  console.log('planAndInsertAll: blueprint chosen', plan.notes);

  // Ensure goal exists
  const { error: goalErr } = await supa
    .from('goals')
    .upsert({ id: goal.id, user_id: userId, title: goal.title, description: goal.description ?? '', deadline: goal.deadlineISO }, { onConflict: 'id' });
  if (goalErr) throw goalErr as any;

  // Insert streak definitions if table exists; ignore failure if not
  try {
    const { error: streakErr } = await supa
      .from('streak_task_defs')
      .insert(plan.streaks.map((s) => ({
        user_id: userId,
        goal_id: goal.id,
        title: s.title,
        description: s.description,
        xp: s.xp,
        proof_required: s.proofRequired,
        source: 'client_planner_v2',
      })));
    if (streakErr) console.log('streak_task_defs insert skipped/failed:', (streakErr as any)?.message ?? streakErr);
  } catch (e:any) {
    console.log('streak_task_defs table missing or insert failed (non-fatal):', e?.message || e);
  }

  // Insert scheduled today tasks
  const { error: todayErr } = await supa
    .from('tasks')
    .insert(plan.schedule.map((t) => ({
      user_id: userId,
      goal_id: goal.id,
      title: t.title,
      description: t.description,
      xp_value: t.xp,
      due_at: toLocalISODate(t.dateISO) + 'T12:00:00.000Z',
      is_habit: false,
      type: 'today',
      priority: goal.priority ?? 'medium',
      proof_mode: t.proofRequired ? 'required' : 'optional',
      source: 'client_planner_v2',
    })));
  if (todayErr) throw todayErr;

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes };
}
