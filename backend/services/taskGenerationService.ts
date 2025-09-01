import { supabaseAdmin } from '../lib/supabaseAdmin';
import { calculateDaysToDeadline } from '../../utils/streakUtils';

interface TaskGenerationResult {
  success: boolean;
  todayTasks: number;
  streakTasks: number;
  message: string;
  error?: string;
}

export class TaskGenerationService {
  
  /**
   * Generate tasks for a specific date if they don't already exist
   */
  static async generateTasksForDate(userId: string, targetDate: string): Promise<TaskGenerationResult> {
    console.log(`Generating tasks for user ${userId} on ${targetDate}`);
    
    try {
      // Check if tasks already exist for this date
      const { data: existingTasks } = await supabaseAdmin
        .from('tasks')
        .select('id, type')
        .eq('user_id', userId)
        .or(`and(type.eq.today,due_date.eq.${targetDate}),and(type.eq.streak,task_date.eq.${targetDate})`);
      
      const existingToday = existingTasks?.filter(t => t.type === 'today').length || 0;
      const existingStreak = existingTasks?.filter(t => t.type === 'streak').length || 0;
      
      if (existingToday > 0 && existingStreak > 0) {
        return {
          success: true,
          todayTasks: 0,
          streakTasks: 0,
          message: `Tasks already exist for ${targetDate} (${existingToday} today, ${existingStreak} streak)`
        };
      }
      
      // Get active goals
      const { data: goals } = await supabaseAdmin
        .from('goals')
        .select('id, title, description, deadline')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (!goals || goals.length === 0) {
        return {
          success: false,
          todayTasks: 0,
          streakTasks: 0,
          message: 'No active goals found',
          error: 'No active goals to generate tasks from'
        };
      }
      
      const tasksToInsert: any[] = [];
      
      // Generate tasks for each active goal
      for (const goal of goals) {
        const daysToDeadline = calculateDaysToDeadline(goal.deadline);
        
        // Only generate if deadline hasn't passed
        if (daysToDeadline > 0) {
          
          // Generate today task if none exists
          if (existingToday === 0) {
            const targetDateTime = new Date(targetDate + 'T18:00:00Z');
            
            tasksToInsert.push({
              user_id: userId,
              goal_id: goal.id,
              title: `Daily progress: ${goal.title}`,
              description: `Make meaningful progress toward: ${goal.description}`,
              type: 'today',
              task_date: null,
              due_at: targetDateTime.toISOString(),
              due_date: targetDate,
              scheduled_for_date: targetDate,
              load_score: 2,
              proof_mode: 'flex',
              status: 'pending',
              completed: false,
              xp_value: 20,
              is_habit: false,
              priority: 'medium'
            });
            // todayTasksGenerated++;
          }
          
          // Generate streak task if none exists
          if (existingStreak === 0) {
            tasksToInsert.push({
              user_id: userId,
              goal_id: goal.id,
              title: `Daily habit: ${goal.title}`,
              description: `Maintain consistent progress toward: ${goal.description}`,
              type: 'streak',
              task_date: targetDate,
              due_at: null,
              due_date: null,
              scheduled_for_date: targetDate,
              load_score: 1,
              proof_mode: 'flex',
              status: 'pending',
              completed: false,
              xp_value: 10,
              is_habit: true,
              priority: 'medium'
            });
            // streakTasksGenerated++;
          }
        }
      }
      
      if (tasksToInsert.length === 0) {
        return {
          success: true,
          todayTasks: 0,
          streakTasks: 0,
          message: 'No new tasks needed - all tasks exist or goals have passed deadlines'
        };
      }
      
      // Insert the tasks
      const { data: insertedTasks, error } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert)
        .select('id, type, title');
      
      if (error) {
        console.error('Error inserting tasks:', error);
        return {
          success: false,
          todayTasks: 0,
          streakTasks: 0,
          message: 'Failed to insert tasks',
          error: error.message
        };
      }
      
      const actualTodayGenerated = insertedTasks?.filter(t => t.type === 'today').length || 0;
      const actualStreakGenerated = insertedTasks?.filter(t => t.type === 'streak').length || 0;
      
      console.log(`Generated ${actualTodayGenerated} today tasks and ${actualStreakGenerated} streak tasks for ${targetDate}`);
      
      return {
        success: true,
        todayTasks: actualTodayGenerated,
        streakTasks: actualStreakGenerated,
        message: `Generated ${actualTodayGenerated + actualStreakGenerated} tasks for ${targetDate}`
      };
      
    } catch (error) {
      console.error('Error in generateTasksForDate:', error);
      return {
        success: false,
        todayTasks: 0,
        streakTasks: 0,
        message: 'Task generation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate tasks for the next N days
   */
  static async generateTasksForUpcomingDays(userId: string, daysAhead: number = 7): Promise<TaskGenerationResult> {
    console.log(`Generating tasks for user ${userId} for next ${daysAhead} days`);
    
    const today = new Date();
    let totalTodayTasks = 0;
    let totalStreakTasks = 0;
    const results = [];
    
    try {
      for (let i = 0; i < daysAhead; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        const result = await this.generateTasksForDate(userId, dateStr);
        
        if (result.success) {
          totalTodayTasks += result.todayTasks;
          totalStreakTasks += result.streakTasks;
        }
        
        results.push({
          date: dateStr,
          ...result
        });
      }
      
      return {
        success: true,
        todayTasks: totalTodayTasks,
        streakTasks: totalStreakTasks,
        message: `Generated ${totalTodayTasks + totalStreakTasks} total tasks across ${daysAhead} days`
      };
      
    } catch (error) {
      console.error('Error in generateTasksForUpcomingDays:', error);
      return {
        success: false,
        todayTasks: totalTodayTasks,
        streakTasks: totalStreakTasks,
        message: 'Bulk task generation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Ensure tasks exist for today and tomorrow
   */
  static async ensureNearTermTasks(userId: string): Promise<TaskGenerationResult> {
    return this.generateTasksForUpcomingDays(userId, 2);
  }
}