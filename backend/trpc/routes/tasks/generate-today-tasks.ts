import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';

// This procedure now just returns existing tasks since they're pre-generated
export const generateTodayTasksProcedure = protectedProcedure
  .input(z.object({
    date: z.string().optional(),
    goalId: z.string().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { date?: string; goalId?: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const date = input.date || new Date().toISOString().split('T')[0];
    
    try {
      console.log('📋 Fetching existing tasks for date:', date);
      
      // Fetch existing tasks for the date
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      
      // Filter by date - for streak tasks use task_date, for today tasks use due_date
      query = query.or(`task_date.eq.${date},due_date.gte.${date}T00:00:00.000Z,due_date.lt.${date}T23:59:59.999Z`);
      
      if (input.goalId) {
        query = query.eq('goal_id', input.goalId);
      }
      
      const { data: tasks, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch tasks: ${error.message}`,
        });
      }
      
      const streakTasks = tasks?.filter(t => t.type === 'streak') || [];
      const todayTasks = tasks?.filter(t => t.type === 'today') || [];
      
      console.log(`Found ${streakTasks.length} streak tasks and ${todayTasks.length} today tasks for ${date}`);
      
      if (tasks && tasks.length === 0) {
        // Check if user has any active goals
        const { data: goals, error: goalsError } = await ctx.supabase
          .from('goals')
          .select('id, title')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (goalsError) {
          console.error('Error checking goals:', goalsError);
        }
        
        if (!goals || goals.length === 0) {
          return {
            notice: 'No active goals found',
            tasks: [],
            streakTasks: [],
            todayTasks: []
          };
        }
        
        return {
          notice: 'No tasks found for this date. Tasks should have been generated when your Ultimate Goal was created.',
          tasks: [],
          streakTasks: [],
          todayTasks: [],
          suggestion: 'Try creating a new Ultimate Goal or check if your existing goals have expired.'
        };
      }
      
      return {
        tasks: tasks || [],
        streakTasks,
        todayTasks,
        totalTasks: tasks?.length || 0
      };
      
    } catch (error) {
      console.error('Error in generateTodayTasks:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Task fetch failed: ${errorMessage}`,
        cause: error,
      });
    }
  });

// Get streak tasks for a specific date
export const getStreakTasksProcedure = protectedProcedure
  .input(z.object({
    date: z.string().optional(),
    goalId: z.string().optional()
  }))
  .query(async ({ input, ctx }: { input: { date?: string; goalId?: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const date = input.date || new Date().toISOString().split('T')[0];
    
    try {
      console.log('🔄 Fetching streak tasks for date:', date);
      
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'streak')
        .eq('task_date', date);
      
      if (input.goalId) {
        query = query.eq('goal_id', input.goalId);
      }
      
      const { data: tasks, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching streak tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch streak tasks: ${error.message}`,
        });
      }
      
      console.log(`Found ${tasks?.length || 0} streak tasks for ${date}`);
      
      return {
        tasks: tasks || [],
        totalTasks: tasks?.length || 0,
        date
      };
      
    } catch (error) {
      console.error('Error in getStreakTasks:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch streak tasks';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Streak task fetch failed: ${errorMessage}`,
        cause: error,
      });
    }
  });

// Generate streak tasks (legacy support - now just returns existing tasks)
export const generateStreakTasksProcedure = protectedProcedure
  .input(z.object({
    goalId: z.string().optional(),
    date: z.string().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { goalId?: string; date?: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const date = input.date || new Date().toISOString().split('T')[0];
    
    try {
      console.log('🔄 Generating/fetching streak tasks for date:', date);
      
      // Just fetch existing streak tasks since they're pre-generated
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'streak')
        .eq('task_date', date);
      
      if (input.goalId) {
        query = query.eq('goal_id', input.goalId);
      }
      
      const { data: tasks, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching streak tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch streak tasks: ${error.message}`,
        });
      }
      
      console.log(`Found ${tasks?.length || 0} streak tasks for ${date}`);
      
      if (!tasks || tasks.length === 0) {
        // Check if user has any active goals
        const { data: goals, error: goalsError } = await ctx.supabase
          .from('goals')
          .select('id, title')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (goalsError) {
          console.error('Error checking goals:', goalsError);
        }
        
        if (!goals || goals.length === 0) {
          return {
            notice: 'No active goals found',
            tasks: []
          };
        }
        
        return {
          notice: 'No streak tasks found for this date. Tasks should have been generated when your Ultimate Goal was created.',
          tasks: [],
          suggestion: 'Try creating a new Ultimate Goal to generate streak tasks.'
        };
      }
      
      return {
        tasks: tasks || [],
        totalTasks: tasks?.length || 0,
        date
      };
      
    } catch (error) {
      console.error('Error in generateStreakTasks:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate streak tasks';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Streak task generation failed: ${errorMessage}`,
        cause: error,
      });
    }
  });