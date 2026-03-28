import { z } from 'zod';
import { protectedProcedure, type ProtectedContext } from '../../create-context';

// Get streak tasks for a specific date
export const getStreakTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string().min(1, 'Target date is required'), // YYYY-MM-DD format
  }))
  .query(async ({ input, ctx }: { input: { targetDate: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { targetDate } = input;
    
    try {
      // Get streak tasks for the target date
      const { data: streakTasks, error: tasksError } = await ctx.supabase
        .from('tasks')
        .select(`
          *,
          goals!inner(
            id,
            title,
            description,
            deadline,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'streak')
        .eq('task_date', targetDate)
        .eq('goals.status', 'active')
        .order('created_at', { ascending: true });
        
      if (tasksError) {
        console.error('Error fetching streak tasks:', tasksError);
        throw new Error(`Failed to fetch streak tasks: ${tasksError.message}`);
      }
      
      return {
        tasks: streakTasks || [],
        count: (streakTasks || []).length
      };
      
    } catch (error) {
      console.error('Error in getStreakTasks:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get streak tasks');
    }
  });

// Get today tasks for a specific date
export const getTodayTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string().min(1, 'Target date is required'), // YYYY-MM-DD format
  }))
  .query(async ({ input, ctx }: { input: { targetDate: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { targetDate } = input;
    
    try {
      // Get today tasks for the target date
      const targetDateISO = new Date(targetDate).toISOString().split('T')[0];
      
      const { data: todayTasks, error: tasksError } = await ctx.supabase
        .from('tasks')
        .select(`
          *,
          goals!inner(
            id,
            title,
            description,
            deadline,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'today')
        .gte('due_at', targetDateISO + 'T00:00:00.000Z')
        .lt('due_at', targetDateISO + 'T23:59:59.999Z')
        .eq('goals.status', 'active')
        .order('due_at', { ascending: true });
        
      if (tasksError) {
        console.error('Error fetching today tasks:', tasksError);
        throw new Error(`Failed to fetch today tasks: ${tasksError.message}`);
      }
      
      return {
        tasks: todayTasks || [],
        count: (todayTasks || []).length
      };
      
    } catch (error) {
      console.error('Error in getTodayTasks:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get today tasks');
    }
  });

// Get all tasks for a specific date (both streak and today)
export const getAllTasksForDateProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string().min(1, 'Target date is required'), // YYYY-MM-DD format
  }))
  .query(async ({ input, ctx }: { input: { targetDate: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { targetDate } = input;
    
    try {
      const targetDateISO = new Date(targetDate).toISOString().split('T')[0];
      
      // Get both streak and today tasks for the target date
      const { data: allTasks, error: tasksError } = await ctx.supabase
        .from('tasks')
        .select(`
          *,
          goals!inner(
            id,
            title,
            description,
            deadline,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('goals.status', 'active')
        .or(`and(type.eq.streak,task_date.eq.${targetDate}),and(type.eq.today,due_at.gte.${targetDateISO}T00:00:00.000Z,due_at.lt.${targetDateISO}T23:59:59.999Z)`)
        .order('type', { ascending: false }) // streak first, then today
        .order('created_at', { ascending: true });
        
      if (tasksError) {
        console.error('Error fetching all tasks:', tasksError);
        throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
      }
      
      const tasks = allTasks || [];
      const streakTasks = tasks.filter(t => t.type === 'streak');
      const todayTasks = tasks.filter(t => t.type === 'today');
      
      return {
        tasks,
        streakTasks,
        todayTasks,
        totalCount: tasks.length,
        streakCount: streakTasks.length,
        todayCount: todayTasks.length
      };
      
    } catch (error) {
      console.error('Error in getAllTasksForDate:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get tasks for date');
    }
  });