import { createClient } from '@supabase/supabase-js';
import { GoalInput, PlanResult } from './types';
import { chooseBlueprint } from './blueprints';
import { detectTasksColumnMap, setTaskType } from '../db/tasksColumnMap';
import { eachDayISOInclusive } from './dateRange';

export async function planAndInsertAll(goal: GoalInput, supabaseUrl: string, supabaseAnonKey: string, userId: string) {
  const plan: PlanResult = chooseBlueprint(goal);
  const supa = createClient(supabaseUrl, supabaseAnonKey);
  const map = await detectTasksColumnMap(supa);

  // Ensure at least one Today task on Day 0 (kickoff)
  const startISO = new Date(goal.createdAtISO).toISOString().slice(0,10);
  if (!plan.schedule.some(t => t.dateISO === startISO)) {
    plan.schedule.unshift({
      goalId: goal.id,
      title: 'Kickoff: Build Your Plan',
      description: 'Review your streak habits and today tasks. Confirm tools and time blocks.',
      xp: 20,
      dateISO: startISO,
      isStreak: false,
      proofRequired: true,
      tags: ['kickoff']
    });
  }

  // Insert TODAY tasks
  const todayRows = plan.schedule.map((t) => {
    const row: any = {
      user_id: userId,
      goal_id: goal.id,
      title: t.title,
      description: t.description,
xp: t.xp,
      [map.primaryDateCol]: t.dateISO,
      source: 'client_planner_v2',
    };
    
    // Set type properly based on detected schema
    setTaskType(row, map, 'today');
    
    // Set additional date columns to avoid NOT NULL constraints
    for (const col of map.alsoSetDateCols) {
      if (col === 'scheduled_for_date') {
        row[col] = t.dateISO;
      } else if (col === 'due_date') {
        row[col] = t.dateISO;
      } else if (col === 'due_at') {
        row[col] = `${t.dateISO}T12:00:00Z`;
      }
    }
    
    if (map.proofCol) row[map.proofCol] = t.proofRequired;
    if (map.tagsCol) row[map.tagsCol] = t.tags ?? [];
    return row;
  });
  
  const { error: todayErr } = await supa.from('tasks').insert(todayRows);
  const todayCount = todayRows.length;
  if (todayErr) throw todayErr;

  // Insert STREAK tasks for every day (inclusive) in chunks
  const allDays = eachDayISOInclusive(goal.createdAtISO, goal.deadlineISO);
  const chunkSize = Number(process.env.EXPO_PUBLIC_STREAK_BATCH_DAYS || 90);
  let streakInserted = 0;
  
  for (let i = 0; i < allDays.length; i += chunkSize) {
    const slice = allDays.slice(i, i + chunkSize);
    const rows: any[] = [];
    
    for (const dateISO of slice) {
      for (const s of plan.streaks) {
        const r: any = {
          user_id: userId,
          goal_id: goal.id,
          title: s.title,
          description: s.description,
xp: s.xp,
          [map.primaryDateCol]: dateISO,
          source: 'client_planner_v2',
        };
        
        // Set type properly based on detected schema
        setTaskType(r, map, 'streak');
        
        // Set additional date columns to avoid NOT NULL constraints
        for (const col of map.alsoSetDateCols) {
          if (col === 'scheduled_for_date') {
            r[col] = dateISO;
          } else if (col === 'task_date') {
            r[col] = dateISO;
          }
        }
        
        if (map.proofCol) r[map.proofCol] = s.proofRequired;
        rows.push(r);
      }
    }
    
    if (rows.length) {
      const { error } = await supa.from('tasks').insert(rows);
      if (error) throw error;
      streakInserted += rows.length;
    }
  }

  return { ok: true, notes: plan.notes, inserted: { today: todayCount ?? todayRows.length, streak: streakInserted } };
}