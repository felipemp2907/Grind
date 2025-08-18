import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { FullPlan, validatePlan } from './schema';
import { PLANNER_SYSTEM_PROMPT, PLANNER_USER_PROMPT } from './prompt';

interface TaskInsert {
  user_id: string;
  goal_id: string;
  title: string;
  description: string;
  type: 'streak' | 'today';
  task_date?: string; // for streak tasks
  due_at?: string; // for today tasks
  load_score: number;
  proof_mode: 'realtime' | 'flex';
  status: string;
  completed: boolean;
  scheduled_for_date: string;
  xp_value: number;
  is_habit: boolean;
  priority: string;
}

export async function planAndSeedFullGoal(
  userId: string,
  goalId: string,
  title: string,
  description: string,
  deadline: string,
  experienceLevel: string = 'beginner',
  timezoneOffset: number = 0
): Promise<{
  success: boolean;
  summary?: {
    goalId: string;
    days: number;
    streak_count: number;
    total_today: number;
    trimmed_days: number;
  };
  error?: string;
}> {
  try {
    console.log(`=== BATCH PLANNER START ===`);
    console.log(`Goal: ${title}`);
    console.log(`User: ${userId}`);
    console.log(`Goal ID: ${goalId}`);
    console.log(`Deadline: ${deadline}`);
    
    // 1. Generate the plan using AI
    console.log('Generating plan with AI...');
    let fullPlan: FullPlan;
    try {
      fullPlan = await generateFullPlan(title, description, deadline, experienceLevel, timezoneOffset);
      console.log('AI plan generated successfully');
    } catch (error) {
      console.warn('AI plan generation failed, using fallback:', error);
      fullPlan = generateFallbackPlan(title, deadline);
    }
    
    // 2. Convert plan to database tasks
    console.log('Converting plan to database tasks...');
    const allTasks = convertPlanToTasks(fullPlan, userId, goalId, deadline);
    
    const streakTasks = allTasks.filter(t => t.type === 'streak');
    const todayTasks = allTasks.filter(t => t.type === 'today');
    console.log(`Generated ${allTasks.length} total tasks`);
    console.log(`Streak tasks: ${streakTasks.length}`);
    console.log(`Today tasks: ${todayTasks.length}`);
    
    if (allTasks.length === 0) {
      throw new Error('No tasks were generated from the plan');
    }
    
    if (streakTasks.length === 0) {
      console.warn('No streak tasks generated - this might indicate a problem with the plan');
    }
    
    // 3. Insert all tasks in a single transaction
    console.log('Inserting tasks in batch...');
    const insertResult = await insertTasksBatch(allTasks);
    
    if (insertResult.failed > 0) {
      console.warn(`${insertResult.failed} tasks failed to insert out of ${allTasks.length}`);
    }
    
    if (insertResult.success === 0) {
      throw new Error('Failed to insert any tasks into the database');
    }
    
    console.log(`Successfully inserted ${insertResult.success} tasks`);
    
    // 4. Calculate summary
    const days = calculateDaysBetween(new Date(), new Date(deadline));
    const streakCount = fullPlan.streak_habits.length;
    const totalToday = fullPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0);
    
    const summary = {
      goalId,
      days,
      streak_count: streakCount,
      total_today: totalToday,
      trimmed_days: 0 // TODO: implement trimming logic
    };
    
    console.log(`BATCH PLAN SEEDED ${JSON.stringify(summary)}`);
    console.log(`=== BATCH PLANNER SUCCESS ===`);
    
    return {
      success: true,
      summary
    };
    
  } catch (error) {
    console.error(`BATCH PLAN FAILED { stage: 'seed', error: ${error instanceof Error ? error.message : 'Unknown error'} }`);
    console.error(`=== BATCH PLANNER ERROR ===`);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function generateFullPlan(
  title: string,
  description: string,
  deadline: string,
  experienceLevel: string,
  timezoneOffset: number
): Promise<FullPlan> {
  try {
    console.log('Calling AI service for plan generation...');
    
    const systemPrompt = PLANNER_SYSTEM_PROMPT;
    const userPrompt = PLANNER_USER_PROMPT(title, description, deadline, experienceLevel, timezoneOffset);
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const completion = result.completion;
    
    if (!completion) {
      throw new Error('No completion received from AI service');
    }
    
    console.log('AI response received, parsing JSON...');
    
    // Try to extract JSON from the completion
    let planData;
    try {
      // First try to parse as direct JSON
      planData = JSON.parse(completion);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = completion.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[1]);
      } else {
        // Last resort: try to find JSON-like content
        const jsonStart = completion.indexOf('{');
        const jsonEnd = completion.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          planData = JSON.parse(completion.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error('Could not extract valid JSON from AI response');
        }
      }
    }
    
    console.log('Validating plan structure...');
    const validatedPlan = validatePlan(planData);
    
    console.log(`Plan validated: ${validatedPlan.streak_habits.length} streak habits, ${validatedPlan.daily_plan.length} daily plans`);
    
    return validatedPlan;
    
  } catch (error) {
    console.error('Plan generation failed:', error);
    
    // Fallback to deterministic comprehensive plan
    console.log('Generating fallback comprehensive plan...');
    return generateFallbackPlan(title, deadline);
  }
}

function generateFallbackPlan(title: string, deadline: string): FullPlan {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const days = calculateDaysBetween(today, deadlineDate);
  
  console.log(`Generating fallback plan for ${days} days`);
  
  // Create multiple streak habits for better engagement
  const streakHabits = [
    {
      title: `Daily work on ${title}`,
      desc: `Dedicate focused time each day to make progress on ${title}`,
      load: 2,
      proof_mode: 'flex' as const
    },
    {
      title: `Track progress`,
      desc: `Document and reflect on daily progress toward ${title}`,
      load: 1,
      proof_mode: 'flex' as const
    }
  ];
  
  // Create daily plans with tasks for EVERY day until deadline
  const dailyPlan = [];
  for (let i = 0; i < days; i++) { // Generate for ALL days, not just 30
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const todayTasks = [];
    
    // Add different types of tasks based on the day
    if (i === 0) {
      // First day - planning tasks
      todayTasks.push({
        title: `Create action plan for ${title}`,
        desc: `Break down ${title} into specific, actionable steps`,
        load: 2,
        proof_mode: 'flex' as const
      });
    } else if (i % 7 === 0) {
      // Weekly review tasks
      todayTasks.push({
        title: `Weekly review of ${title}`,
        desc: `Assess progress, adjust strategy, and plan for the upcoming week`,
        load: 2,
        proof_mode: 'flex' as const
      });
    } else if (i % 3 === 0) {
      // Regular progress tasks
      todayTasks.push({
        title: `Focus session on ${title}`,
        desc: `Dedicated work session to advance ${title}`,
        load: 2,
        proof_mode: 'flex' as const
      });
    } else if (i % 5 === 0) {
      // Research/learning tasks
      todayTasks.push({
        title: `Research for ${title}`,
        desc: `Gather information, resources, or skills needed for ${title}`,
        load: 1,
        proof_mode: 'flex' as const
      });
    }
    
    // Add milestone tasks at key points
    const progressPercent = (i / days) * 100;
    if (progressPercent >= 25 && progressPercent < 30 && i > 0) {
      todayTasks.push({
        title: `25% milestone check for ${title}`,
        desc: `Evaluate progress and adjust approach if needed`,
        load: 1,
        proof_mode: 'flex' as const
      });
    } else if (progressPercent >= 50 && progressPercent < 55 && i > 0) {
      todayTasks.push({
        title: `50% milestone check for ${title}`,
        desc: `Mid-point review and strategy refinement`,
        load: 1,
        proof_mode: 'flex' as const
      });
    } else if (progressPercent >= 75 && progressPercent < 80 && i > 0) {
      todayTasks.push({
        title: `75% milestone check for ${title}`,
        desc: `Final stretch preparation and quality check`,
        load: 1,
        proof_mode: 'flex' as const
      });
    }
    
    // Final day tasks
    if (i === days - 1) {
      todayTasks.push({
        title: `Complete ${title}`,
        desc: `Final execution and completion of ${title}`,
        load: 2,
        proof_mode: 'realtime' as const
      });
    }
    
    dailyPlan.push({
      date: dateStr,
      today_tasks: todayTasks
    });
  }
  
  console.log(`Fallback plan generated: ${streakHabits.length} streak habits, ${dailyPlan.length} daily plans`);
  console.log(`Total today tasks: ${dailyPlan.reduce((sum, day) => sum + day.today_tasks.length, 0)}`);
  
  return {
    streak_habits: streakHabits,
    daily_plan: dailyPlan
  };
}

function convertPlanToTasks(
  plan: FullPlan,
  userId: string,
  goalId: string,
  deadline: string
): TaskInsert[] {
  const tasks: TaskInsert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const dateKey = (d: Date) => d.toISOString().split('T')[0];
  const sumStreakLoad = plan.streak_habits.reduce((sum, h) => sum + (h.load ?? 1), 0);

  // Build map of planned today tasks by date
  const plannedMap = new Map<string, { title: string; desc: string; load: number; proof_mode: 'realtime' | 'flex' }[]>();
  for (const day of plan.daily_plan) {
    if (!day?.date) continue;
    const d = new Date(day.date);
    d.setHours(0, 0, 0, 0);
    if (d > deadlineDate) continue;
    const key = dateKey(d);
    const arr = plannedMap.get(key) ?? [];
    for (const t of day.today_tasks ?? []) {
      arr.push({ title: t.title, desc: t.desc, load: t.load ?? 1, proof_mode: t.proof_mode });
    }
    plannedMap.set(key, arr);
  }

  // Iterate each day from today..deadline, add streaks, and schedule capped today tasks with carryover forward
  const carryover: { title: string; desc: string; load: number; proof_mode: 'realtime' | 'flex' }[] = [];
  const nineAMHours = 9;
  let dayCount = 0;
  for (let d = new Date(today); d <= deadlineDate; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    dayCount++;

    // Streak tasks for EVERY day
    for (const habit of plan.streak_habits) {
      tasks.push({
        user_id: userId,
        goal_id: goalId,
        title: habit.title,
        description: habit.desc,
        type: 'streak',
        task_date: key,
        load_score: habit.load,
        proof_mode: habit.proof_mode,
        status: 'pending',
        completed: false,
        scheduled_for_date: key,
        xp_value: habit.load * 10,
        is_habit: true,
        priority: 'medium',
      });
    }
    
    if (dayCount <= 3) {
      console.log(`Day ${dayCount} (${key}): Added ${plan.streak_habits.length} streak tasks`);
    }

    // Determine caps for today
    const isToday = key === dateKey(new Date());
    const now = new Date();
    const nowPastAgenda = isToday && now.getHours() >= nineAMHours;
    const maxTodayCount = nowPastAgenda ? 1 : 3;
    let remainingLoad = Math.max(0, 5 - sumStreakLoad);

    // Collect tasks for this date + carryover
    const pool = [...(plannedMap.get(key) ?? []), ...carryover];
    carryover.length = 0;

    let usedCount = 0;
    for (const t of pool) {
      if (usedCount >= maxTodayCount) {
        carryover.push(t);
        continue;
      }
      if (t.load > remainingLoad) {
        carryover.push(t);
        continue;
      }
      usedCount += 1;
      remainingLoad -= t.load;
      const due = new Date(d);
      due.setHours(nineAMHours, 0, 0, 0);
      tasks.push({
        user_id: userId,
        goal_id: goalId,
        title: t.title,
        description: t.desc,
        type: 'today',
        due_at: due.toISOString(),
        load_score: t.load,
        proof_mode: t.proof_mode,
        status: 'pending',
        completed: false,
        scheduled_for_date: key,
        xp_value: t.load * 10,
        is_habit: false,
        priority: 'medium',
      });
    }
    
    if (dayCount <= 3) {
      console.log(`Day ${dayCount} (${key}): Added ${usedCount} today tasks from pool of ${pool.length}`);
    }
  }
  
  console.log(`Processed ${dayCount} days total`);

  // Any remaining carryover tasks are dropped if past deadline
  if (carryover.length > 0) {
    console.log(`Carryover tasks beyond deadline dropped: ${carryover.length}`);
  }

  const finalStreakTasks = tasks.filter(t => t.type === 'streak');
  const finalTodayTasks = tasks.filter(t => t.type === 'today');
  
  console.log(`Converted plan to ${tasks.length} database tasks:`);
  console.log(`- Streak tasks: ${finalStreakTasks.length} (${plan.streak_habits.length} habits × ${dayCount} days = ${plan.streak_habits.length * dayCount} expected)`);
  console.log(`- Today tasks: ${finalTodayTasks.length}`);
  
  if (finalStreakTasks.length !== plan.streak_habits.length * dayCount) {
    console.warn(`Streak task count mismatch! Expected ${plan.streak_habits.length * dayCount}, got ${finalStreakTasks.length}`);
  }
  
  return tasks;
}

async function insertTasksBatch(tasks: TaskInsert[]): Promise<{
  success: number;
  failed: number;
}> {
  if (tasks.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  try {
    console.log(`Inserting ${tasks.length} tasks in batch...`);
    
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert(tasks)
      .select('id');
    
    if (error) {
      console.error('Batch insert error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Database insert failed: ${error.message}`);
    }
    
    const successCount = data?.length || 0;
    console.log(`Successfully inserted ${successCount} tasks`);
    
    return {
      success: successCount,
      failed: tasks.length - successCount
    };
    
  } catch (error) {
    console.error('Batch insert exception:', error);
    throw error;
  }
}

function calculateDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}