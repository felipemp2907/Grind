import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectTasksColumnMap,
  TaskColumnMap,
  setTaskType,
  setTaskDates,
  setTaskTimeIfNeeded,
  toLocalYyyyMmDd,
} from '../db/tasksColumnMap';

function isUuid(v: string | undefined): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function planAndInsertAll(
  goal: GoalInput,
  supa: SupabaseClient,
  userId: string,
) {
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
      .upsert(
        { id: goalId, user_id: userId, title: goal.title, description: goal.description ?? '', deadline: goal.deadlineISO },
        { onConflict: 'id' },
      );
    if (upErr) throw upErr as any;
  }

  // Optional: streak definitions
  try {
    const { error: streakErr } = await supa
      .from('streak_task_defs')
      .insert(
        plan.streaks.map((s) => ({
          user_id: userId,
          goal_id: goalId,
          title: s.title,
          description: s.description,
          xp: s.xp,
          proof_required: s.proofRequired,
        })),
      );
    if (streakErr) console.log('streak_task_defs insert skipped/failed:', (streakErr as any)?.message ?? streakErr);
  } catch (e: any) {
    console.log('streak_task_defs table missing or insert failed (non-fatal):', e?.message || e);
  }

  const map: TaskColumnMap = await detectTasksColumnMap(supa);
  // detectTasksColumnMap now throws if no date column is found, so we don't need to check here

  // TODAY tasks
  const todayRows = plan.schedule.map((t) => {
    const yyyyMmDd = t.dateISO ?? toLocalYyyyMmDd(new Date());
    const row: Record<string, unknown> = {
      user_id: userId,
      goal_id: goalId,
      title: t.title,
      description: t.description,
      xp_value: t.xp ?? 0,
    };
    setTaskDates(row, map, yyyyMmDd);
    setTaskTimeIfNeeded(row, map);
    setTaskType(row, map, 'today');
    if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
    if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
    return row;
  });
  let todayInsertErr = undefined as unknown;
  {
    const { error } = await supa.from('tasks').insert(todayRows);
    todayInsertErr = error as unknown;
  }
  if (todayInsertErr) {
    const err = todayInsertErr as any;
    const msg: string = (err?.message ?? err?.details ?? String(err)) as string;
    console.error('Insert TODAY failed. Column map:', map, 'error:', msg);
    if (typeof msg === 'string' && msg.includes('scheduled_for_date')) {
      const todayRowsRetry = plan.schedule.map((t) => {
        const yyyyMmDd = t.dateISO ?? toLocalYyyyMmDd(new Date());
        const row: Record<string, unknown> = {
          user_id: userId,
          goal_id: goalId,
          title: t.title,
          description: t.description,
          xp_value: t.xp ?? 0,
        };
        // Original mapping
        setTaskDates(row, map, yyyyMmDd);
        setTaskTimeIfNeeded(row, map);
        setTaskType(row, map, 'today');
        if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
        if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
        // Force scheduled_for_date for schemas requiring it (detector may be blocked by RLS)
        (row as any)['scheduled_for_date'] = yyyyMmDd;
        return row;
      });
      const { error: retryErr } = await supa.from('tasks').insert(todayRowsRetry);
      if (retryErr) {
        console.error('Insert TODAY retry with scheduled_for_date failed:', retryErr);
        throw retryErr as any;
      }
    } else {
      throw err as any;
    }
  }

  // STREAK tasks up to horizon
  const start = new Date(goal.createdAtISO);
  const end = new Date(goal.deadlineISO);
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const horizonDays = Math.min(diffDays, 120);
  const streakRows: Record<string, unknown>[] = [];
  for (let d = 0; d < horizonDays; d++) {
    const date = new Date(start.getTime() + d * 86400000);
    const yyyyMmDd = toLocalYyyyMmDd(date);
    for (const s of plan.streaks) {
      const r: Record<string, unknown> = {
        user_id: userId,
        goal_id: goalId,
        title: s.title,
        description: s.description,
        xp_value: s.xp ?? 0,
      };
      setTaskDates(r, map, yyyyMmDd);
      setTaskTimeIfNeeded(r, map);
      setTaskType(r, map, 'streak');
      if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
      streakRows.push(r);
    }
  }
  if (streakRows.length) {
    let streakInsertErr = undefined as unknown;
    {
      const { error } = await supa.from('tasks').insert(streakRows);
      streakInsertErr = error as unknown;
    }
    if (streakInsertErr) {
      const err = streakInsertErr as any;
      const msg: string = (err?.message ?? err?.details ?? String(err)) as string;
      console.error('Insert STREAK failed. Column map:', map, 'error:', msg);
      if (typeof msg === 'string' && msg.includes('scheduled_for_date')) {
        const start2 = new Date(goal.createdAtISO);
        const streakRowsRetry: Record<string, unknown>[] = [];
        for (let d = 0; d < horizonDays; d++) {
          const date = new Date(start2.getTime() + d * 86400000);
          const yyyyMmDd = toLocalYyyyMmDd(date);
          for (const s of plan.streaks) {
            const r: Record<string, unknown> = {
              user_id: userId,
              goal_id: goalId,
              title: s.title,
              description: s.description,
              xp_value: s.xp ?? 0,
            };
            setTaskDates(r, map, yyyyMmDd);
            setTaskTimeIfNeeded(r, map);
            setTaskType(r, map, 'streak');
            if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
            (r as any)['scheduled_for_date'] = yyyyMmDd;
            streakRowsRetry.push(r);
          }
        }
        const { error: retryErr } = await supa.from('tasks').insert(streakRowsRetry);
        if (retryErr) {
          console.error('Insert STREAK retry with scheduled_for_date failed:', retryErr);
          throw retryErr as any;
        }
      } else {
        throw err as any;
      }
    }
  }

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes, goalId };
}
