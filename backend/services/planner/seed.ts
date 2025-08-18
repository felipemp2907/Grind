import { supabaseAdmin } from '../../lib/supabaseAdmin';
import type { PlanData } from './schema';

interface SeedRequest {
  userId: string;
  goalId: string;
  plan: PlanData;
  agendaTime: string;
  timezone: number;
}

interface SeedResult {
  success: boolean;
  summary?: {
    goalId: string;
    days: number;
    streak_count: number;
    total_today: number;
    trimmed_days: number;
  };
  error?: string;
}

export async function seedPlanToDatabase(request: SeedRequest): Promise<SeedResult> {
  const { userId, goalId, plan, agendaTime, timezone } = request;
  
  console.log(`Seeding plan to database for goal ${goalId}`);
  
  try {
    // Start transaction
    const tasksToInsert: any[] = [];
    let totalTodayTasks = 0;
    let trimmedDays = 0;
    
    // Parse agenda time
    const [agendaHour, agendaMinute] = agendaTime.split(':').map(Number);
    
    // Process each day in the plan
    for (const dayPlan of plan.daily_plan) {
      const date = new Date(dayPlan.date);
      
      // Add streak tasks for this date
      for (const streakHabit of plan.streak_habits) {
        tasksToInsert.push({
          user_id: userId,
          goal_id: goalId,
          title: streakHabit.title,
          description: streakHabit.desc,
          type: 'streak',
          task_date: dayPlan.date,
          due_at: null,
          load_score: streakHabit.load,
          proof_mode: streakHabit.proof_mode,
          status: 'pending',
          completed: false,
          xp_value: streakHabit.load * 10,
          is_habit: true,
          priority: 'medium'
        });
      }
      
      // Add today tasks for this date (with load and count limits)
      const streakLoad = plan.streak_habits.reduce((sum, habit) => sum + habit.load, 0);
      let remainingLoad = 5 - streakLoad;
      let todayTasksAdded = 0;
      
      for (const todayTask of dayPlan.today_tasks) {
        // Enforce limits: max 3 today-tasks per day, total daily load ≤ 5
        if (todayTasksAdded >= 3 || remainingLoad < todayTask.load) {
          trimmedDays++;
          console.warn(`Trimming task "${todayTask.title}" on ${dayPlan.date} due to limits`);
          continue;
        }
        
        // Create due_at timestamp for today tasks
        const dueAt = new Date(date);
        dueAt.setHours(agendaHour, agendaMinute, 0, 0);
        
        tasksToInsert.push({
          user_id: userId,
          goal_id: goalId,
          title: todayTask.title,
          description: todayTask.desc,
          type: 'today',
          task_date: null,
          due_at: dueAt.toISOString(),
          load_score: todayTask.load,
          proof_mode: todayTask.proof_mode,
          status: 'pending',
          completed: false,
          xp_value: todayTask.load * 10,
          is_habit: false,
          priority: 'medium'
        });
        
        remainingLoad -= todayTask.load;
        todayTasksAdded++;
        totalTodayTasks++;
      }
    }
    
    console.log(`Inserting ${tasksToInsert.length} tasks to database`);
    
    // Insert all tasks in a single transaction
    const { data: insertedTasks, error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert)
      .select('id, type');
    
    if (insertError) {
      console.error('Task insertion failed:', insertError);
      throw new Error(`Task insertion failed: ${insertError.message}`);
    }
    
    if (!insertedTasks || insertedTasks.length === 0) {
      throw new Error('No tasks were inserted');
    }
    
    const streakTaskCount = insertedTasks.filter(t => t.type === 'streak').length;
    
    console.log(`Successfully inserted ${insertedTasks.length} tasks (${streakTaskCount} streak, ${totalTodayTasks} today)`);
    
    // Log success telemetry
    console.log('BATCH_PLAN_SEEDED', {
      goalId,
      days: plan.daily_plan.length,
      streak_count: streakTaskCount,
      total_today: totalTodayTasks,
      trimmed_days: trimmedDays
    });
    
    return {
      success: true,
      summary: {
        goalId,
        days: plan.daily_plan.length,
        streak_count: streakTaskCount,
        total_today: totalTodayTasks,
        trimmed_days: trimmedDays
      }
    };
    
  } catch (error) {
    console.error('BATCH_PLAN_FAILED', {
      goalId,
      stage: 'seed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      error: `Failed to seed plan to database: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}