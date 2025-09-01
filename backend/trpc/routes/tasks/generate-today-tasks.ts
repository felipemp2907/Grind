import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { calculateDaysToDeadline } from '../../../../utils/streakUtils';

// Generate today tasks procedure - now actively generates tasks
export const generateTodayTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string()
  }))
  .mutation(async ({ input, ctx }: { input: { targetDate: string }; ctx: ProtectedContext }) => {
    console.log('Generating today tasks for date:', input.targetDate);
    
    const userId = ctx.user.id;
    const targetDate = input.targetDate;
    
    try {
      // Check if today tasks already exist for this date
      const { data: existingTasks } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'today')
        .or(`due_date.eq.${targetDate},scheduled_for_date.eq.${targetDate}`);
      
      if (existingTasks && existingTasks.length > 0) {
        console.log(`Today tasks already exist for ${targetDate}`);
        return {
          message: 'Today tasks already exist for this date',
          tasksGenerated: 0,
          existingTasks: existingTasks.length
        };
      }
      
      // Get active goals to generate today tasks from
      const { data: goals } = await supabaseAdmin
        .from('goals')
        .select('id, title, description, deadline')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (!goals || goals.length === 0) {
        return {
          message: 'No active goals found to generate today tasks',
          tasksGenerated: 0
        };
      }
      
      const tasksToInsert: any[] = [];
      const targetDateTime = new Date(targetDate + 'T18:00:00Z'); // Default to 6 PM
      
      // Generate 1-3 today tasks based on active goals
      for (const goal of goals.slice(0, 3)) { // Limit to 3 goals max
        const daysToDeadline = calculateDaysToDeadline(goal.deadline);
        
        // Only generate if deadline hasn't passed
        if (daysToDeadline > 0) {
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
            load_score: 2, // Medium load
            proof_mode: 'flex',
            status: 'pending',
            completed: false,
            xp_value: 20,
            is_habit: false,
            priority: 'medium'
          });
        }
      }
      
      if (tasksToInsert.length === 0) {
        return {
          message: 'No tasks generated - all goals may have passed their deadlines',
          tasksGenerated: 0
        };
      }
      
      // Insert the tasks
      const { data: insertedTasks, error } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert)
        .select('id, title');
      
      if (error) {
        console.error('Error inserting today tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate today tasks: ${error.message}`
        });
      }
      
      console.log(`Generated ${insertedTasks?.length || 0} today tasks for ${targetDate}`);
      
      return {
        message: 'Today tasks generated successfully',
        tasksGenerated: insertedTasks?.length || 0,
        tasks: insertedTasks?.map(t => ({ id: t.id, title: t.title })) || []
      };
      
    } catch (error) {
      console.error('Error in generateTodayTasks:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate today tasks'
      });
    }
  });

// Generate streak tasks procedure - now actively generates tasks
export const generateStreakTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string(),
    forceRegenerate: z.boolean().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { targetDate: string; forceRegenerate?: boolean }; ctx: ProtectedContext }) => {
    console.log('Generating streak tasks for date:', input.targetDate);
    
    const userId = ctx.user.id;
    const targetDate = input.targetDate;
    const forceRegenerate = input.forceRegenerate || false;
    
    try {
      // Check if streak tasks already exist for this date
      if (!forceRegenerate) {
        const { data: existingTasks } = await supabaseAdmin
          .from('tasks')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'streak')
          .or(`task_date.eq.${targetDate},scheduled_for_date.eq.${targetDate}`);
        
        if (existingTasks && existingTasks.length > 0) {
          console.log(`Streak tasks already exist for ${targetDate}`);
          return {
            message: 'Streak tasks already exist for this date',
            tasksGenerated: 0,
            existingTasks: existingTasks.length
          };
        }
      }
      
      // Get active goals to generate streak tasks from
      const { data: goals } = await supabaseAdmin
        .from('goals')
        .select('id, title, description, deadline')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (!goals || goals.length === 0) {
        return {
          message: 'No active goals found to generate streak tasks',
          tasksGenerated: 0
        };
      }
      
      const tasksToInsert: any[] = [];
      
      // Generate streak tasks (habits) for each active goal
      for (const goal of goals) {
        const daysToDeadline = calculateDaysToDeadline(goal.deadline);
        
        // Only generate if deadline hasn't passed
        if (daysToDeadline > 0) {
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
            load_score: 1, // Low load for habits
            proof_mode: 'flex',
            status: 'pending',
            completed: false,
            xp_value: 10,
            is_habit: true,
            priority: 'medium'
          });
        }
      }
      
      if (tasksToInsert.length === 0) {
        return {
          message: 'No tasks generated - all goals may have passed their deadlines',
          tasksGenerated: 0
        };
      }
      
      // If force regenerate, delete existing tasks first
      if (forceRegenerate) {
        await supabaseAdmin
          .from('tasks')
          .delete()
          .eq('user_id', userId)
          .eq('type', 'streak')
          .or(`task_date.eq.${targetDate},scheduled_for_date.eq.${targetDate}`);
      }
      
      // Insert the tasks
      const { data: insertedTasks, error } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert)
        .select('id, title');
      
      if (error) {
        console.error('Error inserting streak tasks:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate streak tasks: ${error.message}`
        });
      }
      
      console.log(`Generated ${insertedTasks?.length || 0} streak tasks for ${targetDate}`);
      
      return {
        message: 'Streak tasks generated successfully',
        tasksGenerated: insertedTasks?.length || 0,
        tasks: insertedTasks?.map(t => ({ id: t.id, title: t.title })) || []
      };
      
    } catch (error) {
      console.error('Error in generateStreakTasks:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate streak tasks'
      });
    }
  });

// Helper function to generate today tasks for a specific date
async function generateTodayTasksForDate(userId: string, targetDate: string) {
  // Check if today tasks already exist for this date
  const { data: existingTasks } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'today')
    .or(`due_date.eq.${targetDate},scheduled_for_date.eq.${targetDate}`);
  
  if (existingTasks && existingTasks.length > 0) {
    return { tasksGenerated: 0, message: 'Tasks already exist' };
  }
  
  // Get active goals to generate today tasks from
  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('id, title, description, deadline')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (!goals || goals.length === 0) {
    return { tasksGenerated: 0, message: 'No active goals' };
  }
  
  const tasksToInsert: any[] = [];
  const targetDateTime = new Date(targetDate + 'T18:00:00Z');
  
  // Generate 1-3 today tasks based on active goals
  for (const goal of goals.slice(0, 3)) {
    const daysToDeadline = calculateDaysToDeadline(goal.deadline);
    
    if (daysToDeadline > 0) {
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
    }
  }
  
  if (tasksToInsert.length === 0) {
    return { tasksGenerated: 0, message: 'No valid goals' };
  }
  
  const { data: insertedTasks, error } = await supabaseAdmin
    .from('tasks')
    .insert(tasksToInsert)
    .select('id, title');
  
  if (error) {
    throw new Error(`Failed to insert today tasks: ${error.message}`);
  }
  
  return { tasksGenerated: insertedTasks?.length || 0, message: 'Success' };
}

// Helper function to generate streak tasks for a specific date
async function generateStreakTasksForDate(userId: string, targetDate: string) {
  // Check if streak tasks already exist for this date
  const { data: existingTasks } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'streak')
    .or(`task_date.eq.${targetDate},scheduled_for_date.eq.${targetDate}`);
  
  if (existingTasks && existingTasks.length > 0) {
    return { tasksGenerated: 0, message: 'Tasks already exist' };
  }
  
  // Get active goals to generate streak tasks from
  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('id, title, description, deadline')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (!goals || goals.length === 0) {
    return { tasksGenerated: 0, message: 'No active goals' };
  }
  
  const tasksToInsert: any[] = [];
  
  // Generate streak tasks (habits) for each active goal
  for (const goal of goals) {
    const daysToDeadline = calculateDaysToDeadline(goal.deadline);
    
    if (daysToDeadline > 0) {
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
    }
  }
  
  if (tasksToInsert.length === 0) {
    return { tasksGenerated: 0, message: 'No valid goals' };
  }
  
  const { data: insertedTasks, error } = await supabaseAdmin
    .from('tasks')
    .insert(tasksToInsert)
    .select('id, title');
  
  if (error) {
    throw new Error(`Failed to insert streak tasks: ${error.message}`);
  }
  
  return { tasksGenerated: insertedTasks?.length || 0, message: 'Success' };
}

// Auto-generate tasks for upcoming dates
export const autoGenerateTasksProcedure = protectedProcedure
  .input(z.object({
    daysAhead: z.number().default(7) // Generate tasks for next 7 days
  }))
  .mutation(async ({ input, ctx }: { input: { daysAhead: number }; ctx: ProtectedContext }) => {
    console.log(`Auto-generating tasks for next ${input.daysAhead} days`);
    
    const userId = ctx.user.id;
    const today = new Date();
    const results = [];
    
    try {
      for (let i = 0; i < input.daysAhead; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        // Generate today tasks
        const todayResult = await generateTodayTasksForDate(userId, dateStr);
        
        // Generate streak tasks
        const streakResult = await generateStreakTasksForDate(userId, dateStr);
        
        results.push({
          date: dateStr,
          todayTasks: todayResult.tasksGenerated,
          streakTasks: streakResult.tasksGenerated
        });
      }
      
      const totalGenerated = results.reduce((sum, r) => sum + r.todayTasks + r.streakTasks, 0);
      
      return {
        message: `Auto-generated tasks for ${input.daysAhead} days`,
        totalTasksGenerated: totalGenerated,
        dailyBreakdown: results
      };
      
    } catch (error) {
      console.error('Error in autoGenerateTasks:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to auto-generate tasks'
      });
    }
  });