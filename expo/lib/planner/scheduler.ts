import { PlanResult, GoalInput } from './types';
import { chooseBlueprint } from './blueprints';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  detectTasksColumnMap,
  TaskColumnMap,
  setTaskType,
  setTaskDatesForKind,
  setTaskTimeIfNeeded,
  toLocalYyyyMmDd,
  applyTaskTypeVariant,
  JSON_TYPE_VARIANTS,
  TEXT_TYPE_VARIANTS,
  applyTextTypeVariant,
} from '../db/tasksColumnMap';
import { eachDayLocalInclusive, toLocalYYYYMMDD } from './localDate';
import { personalizeWithGPT5 } from './gptPersonalizer';

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
  let plan: PlanResult = chooseBlueprint(goal);
  console.log('planAndInsertAll: blueprint chosen', plan.notes);
  try {
    const enriched = await personalizeWithGPT5({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      streaks: plan.streaks.map(s=>({ title: s.title, description: s.description })),
      schedule: plan.schedule.map(s=>({ title: s.title, description: s.description, dateISO: s.dateISO })),
    });
    plan = {
      streaks: plan.streaks.map((s,i)=>({ ...s, title: enriched.streaks?.[i]?.title ?? s.title, description: enriched.streaks?.[i]?.description ?? s.description })),
      schedule: plan.schedule.map((s,i)=>({ ...s, title: enriched.schedule?.[i]?.title ?? s.title, description: enriched.schedule?.[i]?.description ?? s.description })),
      notes: plan.notes.concat(['personalized'])
    };
  } catch {}

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

  // Ensure at least one "Kickoff" today entry on Day 0
  const startISO = toLocalYYYYMMDD(new Date(goal.createdAtISO));
  const hasDay0 = plan.schedule.some((t) => (t.dateISO ?? '').slice(0, 10) === startISO);
  if (!hasDay0) {
    plan.schedule.unshift({
      goalId: goal.id,
      title: 'Kickoff: Build Your Plan',
      description: 'Review streak habits and today tasks. Confirm tools and time blocks.',
      xp: 20,
      dateISO: startISO,
      isStreak: false,
      proofRequired: true,
      tags: ['kickoff'],
    });
  }

  // TODAY tasks
  const todayRows = plan.schedule.map((t) => {
    const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
    const row: Record<string, unknown> = {
      user_id: userId,
      goal_id: goalId,
      title: t.title,
      description: t.description,
      xp_value: t.xp ?? 0,
    };
    setTaskDatesForKind(row, map, 'today', yyyyMmDd);
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
    if (typeof msg === 'string' && msg.includes('tasks_type_check') && map.typeMap?.col) {
      const preferTextFirst = map.typeMap?.kind === 'text' || map.typeMap?.col === 'type';
      if (preferTextFirst) {
        console.log('Retry TODAY forcing TEXT type variants first');
        for (const fmt of TEXT_TYPE_VARIANTS) {
          const todayRowsRetry2 = plan.schedule.map((t) => {
            const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
            const row: Record<string, unknown> = {
              user_id: userId,
              goal_id: goalId,
              title: t.title,
              description: t.description,
              xp_value: t.xp ?? 0,
            };
            setTaskDatesForKind(row, map, 'today', yyyyMmDd);
            setTaskTimeIfNeeded(row, map);
            applyTextTypeVariant(row, { ...map, typeMap: { kind: 'text', col: map.typeMap!.col } }, 'today', fmt);
            if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
            if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
            return row;
          });
          const { error: retryErr2 } = await supa.from('tasks').insert(todayRowsRetry2);
          if (!retryErr2) {
            console.log('TODAY insert succeeded with TEXT variant');
            todayInsertErr = undefined;
            break;
          } else {
            console.error('TODAY insert failed with TEXT variant', retryErr2);
          }
        }
      }
      if (todayInsertErr) {
        for (const variant of JSON_TYPE_VARIANTS) {
          console.log('Retry TODAY with JSON type variant:', variant);
          const todayRowsRetry = plan.schedule.map((t) => {
            const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
            const row: Record<string, unknown> = {
              user_id: userId,
              goal_id: goalId,
              title: t.title,
              description: t.description,
              xp_value: t.xp ?? 0,
            };
            setTaskDatesForKind(row, map, 'today', yyyyMmDd);
            setTaskTimeIfNeeded(row, map);
            (row as any)[map.typeMap!.col] = undefined;
            applyTaskTypeVariant(row, { ...map, typeMap: { kind: 'json', col: map.typeMap!.col } }, 'today', variant);
            if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
            if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
            return row;
          });
          const { error: retryErr } = await supa.from('tasks').insert(todayRowsRetry);
          if (!retryErr) {
            console.log('TODAY insert succeeded with JSON variant', variant);
            todayInsertErr = undefined;
            break;
          } else {
            console.error('TODAY insert failed with JSON variant', variant, retryErr);
          }
        }
      }
      if (todayInsertErr) {
        console.log('Retry TODAY forcing simple TEXT fallback');
        const typeCol = map.typeMap?.col as string;
        const todayRowsRetry2 = plan.schedule.map((t) => {
          const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
          const row: Record<string, unknown> = {
            user_id: userId,
            goal_id: goalId,
            title: t.title,
            description: t.description,
            xp_value: t.xp ?? 0,
          };
          setTaskDatesForKind(row, map, 'today', yyyyMmDd);
          setTaskTimeIfNeeded(row, map);
          (row as any)[typeCol] = 'today';
          if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
          if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
          return row;
        });
        const { error: retryErr2 } = await supa.from('tasks').insert(todayRowsRetry2);
        if (!retryErr2) {
          console.log('TODAY insert succeeded with TEXT fallback');
          todayInsertErr = undefined;
        } else {
          console.error('TODAY insert failed with TEXT fallback', retryErr2);
        }
      }
      if (todayInsertErr) {
        console.log('Retry TODAY forcing BOOLEAN type fallback');
        const typeCol = map.typeMap?.col as string;
        const todayRowsRetry3 = plan.schedule.map((t) => {
          const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
          const row: Record<string, unknown> = {
            user_id: userId,
            goal_id: goalId,
            title: t.title,
            description: t.description,
            xp_value: t.xp ?? 0,
          };
          setTaskDatesForKind(row, map, 'today', yyyyMmDd);
          setTaskTimeIfNeeded(row, map);
          (row as any)[typeCol] = false;
          if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
          if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
          return row;
        });
        const { error: retryErr3 } = await supa.from('tasks').insert(todayRowsRetry3);
        if (!retryErr3) {
          console.log('TODAY insert succeeded with BOOLEAN fallback');
          todayInsertErr = undefined;
        } else {
          console.error('TODAY insert failed with BOOLEAN fallback', retryErr3);
        }
      }
      if (todayInsertErr) throw err as any;
    } else if (typeof msg === 'string' && msg.includes('scheduled_for_date')) {
      const todayRowsRetry = plan.schedule.map((t) => {
        const yyyyMmDd = (t.dateISO ?? toLocalYYYYMMDD(new Date())).slice(0, 10);
        const row: Record<string, unknown> = {
          user_id: userId,
          goal_id: goalId,
          title: t.title,
          description: t.description,
          xp_value: t.xp ?? 0,
        };
        setTaskDatesForKind(row, map, 'today', yyyyMmDd);
        setTaskTimeIfNeeded(row, map);
        setTaskType(row, map, 'today');
        if (map.proofCol) row[map.proofCol] = t.proofRequired ?? true;
        if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
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

  // STREAK tasks inclusive to deadline, chunked
  const allDays = eachDayLocalInclusive(goal.createdAtISO, goal.deadlineISO);
  const chunkSize = 90;
  for (let i = 0; i < allDays.length; i += chunkSize) {
    const slice = allDays.slice(i, i + chunkSize);
    const streakRows: Record<string, unknown>[] = [];
    for (const yyyyMmDd of slice) {
      for (const s of plan.streaks) {
        const r: Record<string, unknown> = {
          user_id: userId,
          goal_id: goalId,
          title: s.title,
          description: s.description,
          xp_value: s.xp ?? 0,
        };
        setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
        setTaskTimeIfNeeded(r, map);
        setTaskType(r, map, 'streak');
        if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
        streakRows.push(r);
      }
    }
    if (streakRows.length) {
      let streakInsertErr = undefined as unknown;
      const { error } = await supa.from('tasks').insert(streakRows);
      streakInsertErr = error as unknown;
      if (streakInsertErr) {
        const err = streakInsertErr as any;
        const msg: string = (err?.message ?? err?.details ?? String(err)) as string;
        console.error('Insert STREAK failed. Column map:', map, 'error:', msg);
        if (typeof msg === 'string' && (msg.includes('tasks_type_check') || msg.includes('tasks_type_shape')) && map.typeMap?.col) {
          const preferTextFirst = map.typeMap?.kind === 'text' || map.typeMap?.col === 'type';
          if (preferTextFirst) {
            console.log('Retry STREAK forcing TEXT type variants first');
            for (const fmt of TEXT_TYPE_VARIANTS) {
              const retryRows: Record<string, unknown>[] = [];
              for (const yyyyMmDd of slice) {
                for (const s of plan.streaks) {
                  const r: Record<string, unknown> = {
                    user_id: userId,
                    goal_id: goalId,
                    title: s.title,
                    description: s.description,
                    xp_value: s.xp ?? 0,
                  };
                  setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
                  setTaskTimeIfNeeded(r, map);
                  applyTextTypeVariant(r, { ...map, typeMap: { kind: 'text', col: map.typeMap!.col } }, 'streak', fmt);
                  if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
                  retryRows.push(r);
                }
              }
              const { error: retryErr2 } = await supa.from('tasks').insert(retryRows);
              if (!retryErr2) { streakInsertErr = undefined; break; }
            }
          }
          if (streakInsertErr) {
            for (const variant of JSON_TYPE_VARIANTS) {
              console.log('Retry STREAK with JSON type variant:', variant);
              const retryRows: Record<string, unknown>[] = [];
              for (const yyyyMmDd of slice) {
                for (const s of plan.streaks) {
                  const r: Record<string, unknown> = {
                    user_id: userId,
                    goal_id: goalId,
                    title: s.title,
                    description: s.description,
                    xp_value: s.xp ?? 0,
                  };
                  setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
                  setTaskTimeIfNeeded(r, map);
                  applyTaskTypeVariant(r, { ...map, typeMap: { kind: 'json', col: map.typeMap!.col } }, 'streak', variant);
                  if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
                  retryRows.push(r);
                }
              }
              const { error: retryErr } = await supa.from('tasks').insert(retryRows);
              if (!retryErr) { streakInsertErr = undefined; break; }
            }
          }
          if (streakInsertErr) {
            console.log('Retry STREAK forcing simple TEXT fallback');
            const typeCol = map.typeMap?.col as string;
            const retryRows: Record<string, unknown>[] = [];
            for (const yyyyMmDd of slice) {
              for (const s of plan.streaks) {
                const r: Record<string, unknown> = {
                  user_id: userId,
                  goal_id: goalId,
                  title: s.title,
                  description: s.description,
                  xp_value: s.xp ?? 0,
                };
                setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
                setTaskTimeIfNeeded(r, map);
                (r as any)[typeCol] = 'streak';
                if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
                retryRows.push(r);
              }
            }
            const { error: retryErr2 } = await supa.from('tasks').insert(retryRows);
            if (!retryErr2) { streakInsertErr = undefined; }
          }
          if (streakInsertErr) {
            console.log('Retry STREAK forcing BOOLEAN type fallback');
            const typeCol = map.typeMap?.col as string;
            const retryRows: Record<string, unknown>[] = [];
            for (const yyyyMmDd of slice) {
              for (const s of plan.streaks) {
                const r: Record<string, unknown> = {
                  user_id: userId,
                  goal_id: goalId,
                  title: s.title,
                  description: s.description,
                  xp_value: s.xp ?? 0,
                };
                setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
                setTaskTimeIfNeeded(r, map);
                (r as any)[typeCol] = true;
                if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
                retryRows.push(r);
              }
            }
            const { error: retryErr3 } = await supa.from('tasks').insert(retryRows);
            if (!retryErr3) { streakInsertErr = undefined; }
          }
          if (streakInsertErr) throw err as any;
        } else if (typeof msg === 'string' && msg.includes('scheduled_for_date')) {
          const retryRows: Record<string, unknown>[] = [];
          for (const yyyyMmDd of slice) {
            for (const s of plan.streaks) {
              const r: Record<string, unknown> = {
                user_id: userId,
                goal_id: goalId,
                title: s.title,
                description: s.description,
                xp_value: s.xp ?? 0,
              };
              setTaskDatesForKind(r, map, 'streak', yyyyMmDd);
              setTaskTimeIfNeeded(r, map);
              setTaskType(r, map, 'streak');
              if (map.proofCol) r[map.proofCol] = s.proofRequired ?? true;
              (r as any)['scheduled_for_date'] = yyyyMmDd;
              retryRows.push(r);
            }
          }
          const { error: retryErr } = await supa.from('tasks').insert(retryRows);
          if (retryErr) { throw retryErr as any; }
        } else {
          throw err as any;
        }
      }
    }
  }

  console.log('planAndInsertAll: inserted tasks');
  return { ok: true, notes: plan.notes, goalId };
}

export async function planAndInsertAllClient(
  goal: GoalInput,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userId: string,
) {
  const supa = createClient(supabaseUrl, supabaseAnonKey);
  return planAndInsertAll(goal, supa, userId);
}
