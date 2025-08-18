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
    const fullPlan = await generateFullPlan(title, description, deadline, experienceLevel, timezoneOffset);
    
    // 2. Convert plan to database tasks
    console.log('Converting plan to database tasks...');
    const allTasks = convertPlanToTasks(fullPlan, userId, goalId, deadline);
    
    console.log(`Generated ${allTasks.length} total tasks`);
    console.log(`Streak tasks: ${allTasks.filter(t => t.type === 'streak').length}`);
    console.log(`Today tasks: ${allTasks.filter(t => t.type === 'today').length}`);
    
    // 3. Insert all tasks in a single transaction
    console.log('Inserting tasks in batch...');
    const insertResult = await insertTasksBatch(allTasks);
    
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
    
    // Fallback to deterministic minimal plan
    console.log('Generating fallback minimal plan...');
    return generateFallbackPlan(title, deadline);
  }
}

function generateFallbackPlan(title: string, deadline: string): FullPlan {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const days = calculateDaysBetween(today, deadlineDate);
  
  console.log(`Generating fallback plan for ${days} days`);
  
  // Create a simple streak habit
  const streakHabits = [
    {
      title: `Daily progress on ${title}`,
      desc: `Make consistent daily progress toward achieving ${title}`,
      load: 2,
      proof_mode: 'flex' as const
    }
  ];
  
  // Create daily plans with simple tasks
  const dailyPlan = [];
  for (let i = 0; i < Math.min(days, 30); i++) { // Cap at 30 days for fallback
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const todayTasks = [];
    
    // Add a simple task every few days
    if (i % 3 === 0) {
      todayTasks.push({
        title: `Review progress on ${title}`,
        desc: `Take time to review and plan next steps for ${title}`,
        load: 1,
        proof_mode: 'flex' as const
      });
    }
    
    dailyPlan.push({
      date: dateStr,
      today_tasks: todayTasks
    });
  }
  
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
  for (let d = new Date(today); d <= deadlineDate; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);

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
  }

  // Any remaining carryover tasks are dropped if past deadline
  if (carryover.length > 0) {
    console.log(`Carryover tasks beyond deadline dropped: ${carryover.length}`);
  }

  console.log(`Converted plan to ${tasks.length} database tasks`);
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
      return { success: 0, failed: tasks.length };
    }
    
    const successCount = data?.length || 0;
    console.log(`Successfully inserted ${successCount} tasks`);
    
    return {
      success: successCount,
      failed: tasks.length - successCount
    };
    
  } catch (error) {
    console.error('Batch insert exception:', error);
    return { success: 0, failed: tasks.length };
  }
}

function calculateDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}