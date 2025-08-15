import { generateFullGoalPlan } from '../../utils/aiUtils';
import { buildStreakTemplate, calculateDaysToDeadline } from '../../utils/streakUtils';
import { supabaseAdmin } from '../trpc/create-context';

export interface StreakHabit {
  title: string;
  description: string;
  load: number;
  proof_mode: 'flex' | 'realtime';
}

export interface TodayTask {
  title: string;
  desc: string;
  load: number;
  proof_mode: 'flex' | 'realtime';
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  today_tasks: TodayTask[];
}

export interface FullGoalPlan {
  streak_habits: StreakHabit[];
  daily_plan: DailyPlan[];
}

export interface TaskInsertData {
  user_id: string;
  goal_id: string;
  title: string;
  description: string;
  type: 'streak' | 'today';
  task_date: string | null;
  due_at: string | null;
  is_habit: boolean;
  xp_value: number;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  load_score: number;
  proof_mode: 'flex' | 'realtime';
  created_at: string;
  updated_at: string;
}

export class GoalPlannerService {
  /**
   * Generate a complete plan for a goal including streak habits and daily tasks
   */
  async generateFullPlan(
    goalTitle: string,
    goalDescription: string,
    deadline: string,
    experienceLevel: string = 'beginner',
    timezoneOffset: number = 0
  ): Promise<FullGoalPlan> {
    try {
      console.log(`Generating full plan for goal: ${goalTitle}`);
      
      // Try AI generation first
      const aiPlan = await generateFullGoalPlan(
        goalTitle,
        goalDescription,
        deadline,
        experienceLevel,
        timezoneOffset
      );

      // Validate AI plan structure
      if (this.validatePlan(aiPlan)) {
        console.log('AI plan validation successful');
        return aiPlan;
      } else {
        console.warn('AI plan validation failed, using fallback');
        throw new Error('Invalid AI plan structure');
      }
    } catch (error) {
      console.error('AI plan generation failed:', error);
      return this.generateFallbackPlan(goalTitle, goalDescription, deadline);
    }
  }

  /**
   * Validate the structure of a generated plan
   */
  private validatePlan(plan: any): plan is FullGoalPlan {
    if (!plan || typeof plan !== 'object') return false;
    
    // Check streak_habits
    if (!Array.isArray(plan.streak_habits)) return false;
    if (plan.streak_habits.length > 3) return false; // Max 3 streak habits
    
    for (const habit of plan.streak_habits) {
      if (!habit.title || !habit.description) return false;
      if (typeof habit.load !== 'number' || habit.load < 1 || habit.load > 5) return false;
      if (!['flex', 'realtime'].includes(habit.proof_mode)) return false;
    }

    // Check daily_plan
    if (!Array.isArray(plan.daily_plan)) return false;
    
    for (const dayPlan of plan.daily_plan) {
      if (!dayPlan.date || typeof dayPlan.date !== 'string') return false;
      if (!Array.isArray(dayPlan.today_tasks)) return false;
      if (dayPlan.today_tasks.length > 3) return false; // Max 3 today tasks per day
      
      // Check daily load doesn't exceed 5
      const dailyLoad = plan.streak_habits.reduce((sum: number, h: StreakHabit) => sum + h.load, 0) +
                       dayPlan.today_tasks.reduce((sum: number, t: TodayTask) => sum + t.load, 0);
      if (dailyLoad > 5) return false;
      
      for (const task of dayPlan.today_tasks) {
        if (!task.title || !task.desc) return false;
        if (typeof task.load !== 'number' || task.load < 1 || task.load > 5) return false;
        if (!['flex', 'realtime'].includes(task.proof_mode)) return false;
      }
    }

    return true;
  }

  /**
   * Generate a fallback plan when AI fails
   */
  private generateFallbackPlan(
    goalTitle: string,
    goalDescription: string,
    deadline: string
  ): FullGoalPlan {
    console.log('Generating fallback plan');
    
    const daysToDeadline = calculateDaysToDeadline(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a mock goal object for streak template
    const mockGoal = {
      id: 'temp',
      title: goalTitle,
      description: goalDescription,
      deadline,
      category: '',
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progressValue: 0,
      targetValue: 100,
      unit: '',
      xpEarned: 0,
      streakCount: 0,
      todayTasksIds: [],
      streakTaskIds: [],
      status: 'active' as const,
      coverImage: undefined,
      color: undefined,
      priority: 'medium' as const
    };

    // Generate streak habits using existing template
    const streakTemplate = buildStreakTemplate(mockGoal);
    const limitedStreakTemplate = streakTemplate.slice(0, 3);

    const streakHabits: StreakHabit[] = limitedStreakTemplate.map(item => ({
      title: item.title,
      description: item.description,
      load: Math.min(Math.max(1, Math.floor(item.xpValue / 15)), 3),
      proof_mode: 'realtime' as const
    }));

    // Generate basic daily plan with milestone-based tasks
    const dailyPlan: DailyPlan[] = [];
    const milestones = this.generateMilestones(goalTitle, daysToDeadline);

    for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      const todayTasks: TodayTask[] = [];
      
      // Always add a small daily actionable to guarantee at least one today-task per day
      todayTasks.push({
        title: `Key step for ${goalTitle}`,
        desc: 'Make a concrete, bite-sized step toward the goal (10–20 min).',
        load: 1,
        proof_mode: 'flex' as const
      });
      
      // Add milestone tasks on specific days
      const milestone = milestones[Math.floor((dayOffset / daysToDeadline) * milestones.length)];
      if (milestone && dayOffset % Math.max(1, Math.floor(daysToDeadline / milestones.length)) === 0) {
        todayTasks.push({
          title: milestone.title,
          desc: milestone.description,
          load: milestone.load,
          proof_mode: 'flex' as const
        });
      }

      // Add periodic review tasks
      if (dayOffset > 0 && dayOffset % 7 === 0) {
        todayTasks.push({
          title: `Weekly review: ${goalTitle}`,
          desc: 'Review progress and adjust strategy if needed',
          load: 1,
          proof_mode: 'flex' as const
        });
      }

      dailyPlan.push({
        date: dateString,
        today_tasks: todayTasks.slice(0, 3) // Max 3 tasks per day
      });
    }

    return {
      streak_habits: streakHabits,
      daily_plan: dailyPlan
    };
  }

  /**
   * Generate milestone-based tasks for fallback plan
   */
  private generateMilestones(goalTitle: string, daysToDeadline: number) {
    const milestones = [
      {
        title: `Start working on ${goalTitle}`,
        description: 'Begin your journey and set up necessary resources',
        load: 2
      },
      {
        title: `Research for ${goalTitle}`,
        description: 'Gather information and learn fundamentals',
        load: 2
      },
      {
        title: `Practice basics of ${goalTitle}`,
        description: 'Start with fundamental exercises and techniques',
        load: 3
      },
      {
        title: `Build momentum for ${goalTitle}`,
        description: 'Establish consistent practice routine',
        load: 2
      },
      {
        title: `Intermediate work on ${goalTitle}`,
        description: 'Tackle more challenging aspects',
        load: 3
      },
      {
        title: `Advanced practice for ${goalTitle}`,
        description: 'Focus on mastery and refinement',
        load: 3
      },
      {
        title: `Final push for ${goalTitle}`,
        description: 'Complete remaining tasks and polish',
        load: 2
      },
      {
        title: `Complete ${goalTitle}`,
        description: 'Finalize and celebrate achievement',
        load: 1
      }
    ];

    return milestones;
  }

  /**
   * Convert a full plan into database insert tasks
   */
  convertPlanToTasks(
    plan: FullGoalPlan,
    userId: string,
    goalId: string,
    deadline: string
  ): TaskInsertData[] {
    const tasks: TaskInsertData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999);

    const daysToDeadline = calculateDaysToDeadline(deadline);
    const now = new Date().toISOString();

    // Create streak tasks for every day
    for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      // Add all streak habits for this day
      for (const habit of plan.streak_habits) {
        tasks.push({
          user_id: userId,
          goal_id: goalId,
          title: habit.title,
          description: habit.description,
          type: 'streak',
          task_date: dateString,
          due_at: null,
          is_habit: true,
          xp_value: Math.max(10, habit.load * 10),
          priority: habit.load >= 3 ? 'high' : habit.load >= 2 ? 'medium' : 'low',
          completed: false,
          load_score: habit.load,
          proof_mode: habit.proof_mode,
          created_at: now,
          updated_at: now
        });
      }
    }

    // Add today tasks from daily plan
    for (const dayPlan of plan.daily_plan) {
      const planDate = new Date(dayPlan.date);
      if (planDate >= today && planDate <= deadlineDate) {
        for (const task of dayPlan.today_tasks) {
          // Set due_at to 9:00 AM on the planned date (user's agenda time)
          const dueAt = new Date(dayPlan.date + 'T09:00:00.000Z');
          
          tasks.push({
            user_id: userId,
            goal_id: goalId,
            title: task.title,
            description: task.desc,
            type: 'today',
            task_date: null,
            due_at: dueAt.toISOString(),
            is_habit: false,
            xp_value: Math.max(10, task.load * 10),
            priority: task.load >= 3 ? 'high' : task.load >= 2 ? 'medium' : 'low',
            completed: false,
            load_score: task.load,
            proof_mode: task.proof_mode,
            created_at: now,
            updated_at: now
          });
        }
      }
    }

    console.log(`Generated ${tasks.length} tasks: ${tasks.filter(t => t.type === 'streak').length} streak, ${tasks.filter(t => t.type === 'today').length} today`);
    
    return tasks;
  }

  /**
   * Insert tasks in batches using admin client to avoid RLS issues
   */
  async insertTasksBatch(
    client: any,
    tasks: TaskInsertData[],
    batchSize: number = 100
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    console.log(`Inserting ${tasks.length} tasks in batches of ${batchSize}`);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      try {
        const { data, error } = await client
          .from('tasks')
          .insert(batch)
          .select('id, type, task_date, due_at');
          
        if (error) {
          console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
          console.error('Sample task from failed batch:', JSON.stringify(batch[0], null, 2));
          failedCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`Successfully inserted batch ${i}-${i + batch.length} (${batch.length} tasks)`);
          if (data && data.length > 0) {
            console.log(`Sample inserted task:`, data[0]);
          }
        }
      } catch (error) {
        console.error(`Exception inserting batch ${i}-${i + batch.length}:`, error);
        failedCount += batch.length;
      }
    }

    console.log(`Task insertion completed: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  }
}