import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
import { buildStreakTemplate, calculateDaysToDeadline } from '../../../../utils/streakUtils';

const createUltimateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  category: z.string().optional(),
  targetValue: z.number().default(100),
  unit: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  color: z.string().optional(),
  coverImage: z.string().optional()
});

type CreateUltimateGoalInput = z.infer<typeof createUltimateGoalSchema>;

// Simple goal creation procedure without streak tasks
export const createGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema)
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput; ctx: ProtectedContext }) => {
    const user = ctx.user;
    
    try {
      // Create the goal with only the columns that definitely exist
      const goalInsertData: any = {
        user_id: user.id,
        title: input.title,
        description: input.description,
        deadline: new Date(input.deadline).toISOString()
      };
      
      const { data: goalData, error: goalError } = await ctx.supabase
        .from('goals')
        .insert(goalInsertData)
        .select()
        .single();
        
      if (goalError) {
        console.error('Error creating goal:', goalError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create goal: ${goalError.message}`,
        });
      }
      
      if (!goalData) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Goal creation returned no data',
        });
      }
      
      // Return the created goal
      return {
        goal: {
          id: goalData.id,
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          category: input.category,
          createdAt: goalData.created_at,
          updatedAt: goalData.updated_at,
          progressValue: 0,
          targetValue: input.targetValue,
          unit: input.unit,
          xpEarned: 0,
          streakCount: 0,
          todayTasksIds: [],
          streakTaskIds: [],
          status: 'active' as const,
          coverImage: input.coverImage,
          color: input.color,
          priority: input.priority,
          milestones: []
        },
        streakTasksCreated: 0,
        totalDays: 0,
        daysToDeadline: 0
      };
      
    } catch (error) {
      console.error('Error in createGoal:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create goal';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Goal creation failed: ${errorMessage}`,
        cause: error,
      });
    }
  });

// Ultimate goal creation procedure with streak tasks
// Update goal procedure that replaces old tasks with new ones
export const updateUltimateGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema.extend({ id: z.string() }))
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput & { id: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { id, ...updateData } = input;
    
    try {
      // 1. Update the goal
      const { data: goalData, error: goalError } = await ctx.supabase
        .from('goals')
        .update({
          title: updateData.title,
          description: updateData.description,
          deadline: new Date(updateData.deadline).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (goalError) {
        console.error('Error updating goal:', goalError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update goal: ${goalError.message}`,
        });
      }
      
      if (!goalData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }
      
      // 2. Delete ALL existing tasks for this goal (both streak and today tasks)
      const { error: deleteTasksError } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_id', id);
        
      if (deleteTasksError) {
        console.warn('Error deleting existing tasks:', deleteTasksError);
      }
      
      // 3. Build new streak template
      const goalForTemplate = {
        id: goalData.id,
        title: updateData.title,
        description: updateData.description,
        deadline: updateData.deadline,
        category: updateData.category || '',
        milestones: [],
        createdAt: goalData.created_at,
        updatedAt: goalData.updated_at,
        progressValue: 0,
        targetValue: updateData.targetValue,
        unit: updateData.unit || '',
        xpEarned: 0,
        streakCount: 0,
        todayTasksIds: [],
        streakTaskIds: [],
        status: 'active' as const,
        coverImage: updateData.coverImage,
        color: updateData.color,
        priority: updateData.priority
      };
      
      const streakTemplate = buildStreakTemplate(goalForTemplate);
      const limitedStreakTemplate = streakTemplate.slice(0, 3);
      const daysToDeadline = calculateDaysToDeadline(updateData.deadline);
      
      // 4. Create new streak tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const streakTasks = [];
      
      for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        const dateString = currentDate.toISOString().split('T')[0];
        
        for (const streakItem of limitedStreakTemplate) {
          streakTasks.push({
            user_id: user.id,
            goal_id: goalData.id,
            title: streakItem.title,
            description: streakItem.description,
            type: 'streak',
            task_date: dateString,
            is_habit: true,
            xp_value: streakItem.xpValue,
            priority: streakItem.priority,
            completed: false,
            due_date: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // 5. Insert new streak tasks
      if (streakTasks.length > 0) {
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < streakTasks.length; i += batchSize) {
          const batch = streakTasks.slice(i, i + batchSize);
          
          const { error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch);
            
          if (tasksError) {
            console.error(`Error creating new streak tasks:`, tasksError);
            break;
          } else {
            totalInserted += batch.length;
          }
        }
        
        console.log(`Successfully created ${totalInserted} new streak tasks after goal update`);
      }
      
      return {
        goal: {
          id: goalData.id,
          title: updateData.title,
          description: updateData.description,
          deadline: updateData.deadline,
          category: updateData.category,
          createdAt: goalData.created_at,
          updatedAt: goalData.updated_at,
          progressValue: 0,
          targetValue: updateData.targetValue,
          unit: updateData.unit,
          xpEarned: 0,
          streakCount: 0,
          todayTasksIds: [],
          streakTaskIds: [],
          status: 'active' as const,
          coverImage: updateData.coverImage,
          color: updateData.color,
          priority: updateData.priority,
          milestones: []
        },
        streakTasksCreated: streakTasks.length,
        totalDays: daysToDeadline,
        daysToDeadline
      };
      
    } catch (error) {
      console.error('Error in updateUltimateGoal:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ultimate goal';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Goal update failed: ${errorMessage}`,
        cause: error,
      });
    }
  });

export const createUltimateGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema)
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput; ctx: ProtectedContext }) => {
    const user = ctx.user;
    
    try {
      // 1. Create the goal first with only the columns that definitely exist
      const goalInsertData: any = {
        user_id: user.id,
        title: input.title,
        description: input.description,
        deadline: new Date(input.deadline).toISOString()
      };
      
      const { data: goalData, error: goalError } = await ctx.supabase
        .from('goals')
        .insert(goalInsertData)
        .select()
        .single();
        
      if (goalError) {
        console.error('Error creating goal:', goalError);
        throw new Error(`Failed to create goal: ${goalError.message}`);
      }
      
      if (!goalData) {
        throw new Error('Goal creation returned no data');
      }
      
      // 2. Build streak template for this goal
      const goalForTemplate = {
        id: goalData.id,
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        category: input.category || '',
        milestones: [],
        createdAt: goalData.created_at,
        updatedAt: goalData.updated_at,
        progressValue: 0,
        targetValue: input.targetValue,
        unit: input.unit || '',
        xpEarned: 0,
        streakCount: 0,
        todayTasksIds: [],
        streakTaskIds: [],
        status: 'active' as const,
        coverImage: input.coverImage,
        color: input.color,
        priority: input.priority
      };
      
      const streakTemplate = buildStreakTemplate(goalForTemplate);
      
      // Ensure we only have exactly 3 streak tasks
      const limitedStreakTemplate = streakTemplate.slice(0, 3);
      
      const daysToDeadline = calculateDaysToDeadline(input.deadline);
      
      console.log(`Creating streak tasks for ${daysToDeadline} days with ${limitedStreakTemplate.length} habits per day`);
      
      // 3. Create streak tasks for each day from today to deadline
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Delete any existing streak tasks for this goal to avoid duplicates
      const { error: deleteError } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id)
        .eq('type', 'streak');
        
      if (deleteError) {
        console.warn('Error deleting existing streak tasks:', deleteError);
      }
      
      const streakTasks = [];
      
      // Create streak tasks for every day from today to deadline (inclusive)
      for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        const dateString = currentDate.toISOString().split('T')[0];
        
        for (const streakItem of limitedStreakTemplate) {
          streakTasks.push({
            user_id: user.id,
            goal_id: goalData.id,
            title: streakItem.title,
            description: streakItem.description,
            type: 'streak',
            task_date: dateString,
            is_habit: true,
            xp_value: streakItem.xpValue,
            priority: streakItem.priority,
            completed: false,
            due_date: null, // streak tasks use task_date instead
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // 4. Batch insert all streak tasks
      if (streakTasks.length > 0) {
        console.log(`Creating ${streakTasks.length} new streak tasks`);
        
        // Insert in smaller batches to avoid potential issues
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < streakTasks.length; i += batchSize) {
          const batch = streakTasks.slice(i, i + batchSize);
          
          const { error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch);
            
          if (tasksError) {
            console.error(`Error creating streak tasks batch ${i}-${i + batch.length}:`, tasksError);
            // Don't fail the entire operation, just log the error
            console.warn(`Goal created but some streak tasks failed to create: ${tasksError.message}`);
            break;
          } else {
            totalInserted += batch.length;
            console.log(`Successfully created batch ${i}-${i + batch.length} (${batch.length} tasks)`);
          }
        }
        
        console.log(`Successfully created ${totalInserted} out of ${streakTasks.length} streak tasks`);
      } else {
        console.log('No streak tasks to create');
      }
      
      // 5. Return the created goal with additional metadata
      return {
        goal: {
          id: goalData.id,
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          category: input.category,
          createdAt: goalData.created_at,
          updatedAt: goalData.updated_at,
          progressValue: 0,
          targetValue: input.targetValue,
          unit: input.unit,
          xpEarned: 0,
          streakCount: 0,
          todayTasksIds: [],
          streakTaskIds: [],
          status: 'active' as const,
          coverImage: input.coverImage,
          color: input.color,
          priority: input.priority,
          milestones: []
        },
        streakTasksCreated: streakTasks.length,
        totalDays: daysToDeadline,
        daysToDeadline
      };
      
    } catch (error) {
      console.error('Error in createUltimateGoal:', error);
      
      // Return a proper tRPC error to ensure JSON response
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ultimate goal';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Goal creation failed: ${errorMessage}`,
        cause: error,
      });
    }
  });