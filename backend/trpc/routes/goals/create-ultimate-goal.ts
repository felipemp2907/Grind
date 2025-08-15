import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
import { planAndSeedFullGoal } from '../../../services/planner/planAndSeedFullGoal';

const createUltimateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  deadlineISO: z.string().min(1, 'Deadline is required'),
  category: z.string().optional(),
  targetValue: z.number().default(100),
  unit: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  color: z.string().optional(),
  coverImage: z.string().optional()
}).transform((data) => {
  return {
    ...data,
    deadline: data.deadlineISO,
    description: data.description || '' // Ensure description is never undefined
  };
});

type CreateUltimateGoalInput = z.infer<typeof createUltimateGoalSchema>;

// Simple goal creation procedure without automatic task generation
export const createGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema)
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput; ctx: ProtectedContext }) => {
    const user = ctx.user;
    
    try {
      // Create the goal with basic data
      const goalInsertData: any = {
        user_id: user.id,
        title: input.title,
        description: input.description,
        deadline: new Date(input.deadline).toISOString(),
        status: 'active',
        category: input.category || null
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

// Ultimate goal creation procedure with full automatic task generation
export const createUltimateGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema)
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput; ctx: ProtectedContext }) => {
    const user = ctx.user;
    
    try {
      console.log('Creating ultimate goal with full automatic plan generation...');
      
      // 1. Create the goal first
      const goalInsertData: any = {
        user_id: user.id,
        title: input.title,
        description: input.description,
        deadline: new Date(input.deadline).toISOString(),
        status: 'active',
        category: input.category || null
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
      
      console.log(`Goal created with ID: ${goalData.id}`);
      
      // 2. Get user profile for experience level (fallback to 'beginner')
      const { data: userProfile } = await ctx.supabase
        .from('profiles')
        .select('experience_level')
        .eq('id', user.id)
        .single();
        
      const experienceLevel = userProfile?.experience_level || 'beginner';
      
      // 3. Generate and seed full plan using the batch planner
      const planResult = await planAndSeedFullGoal(
        user.id,
        goalData.id,
        input.title,
        input.description,
        input.deadline,
        experienceLevel,
        0 // timezone offset
      );
      
      if (!planResult.success) {
        console.warn('Plan seeding failed, but goal was created:', planResult.error);
      }
      
      // 4. Return the created goal with metadata
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
        seeded: planResult.success,
        summary: planResult.summary,
        error: planResult.error
      };
      
    } catch (error) {
      console.error('=== GOAL CREATION ERROR ===');
      console.error('Error in createUltimateGoal:', error);
      console.error('=== GOAL CREATION ERROR ===');
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ultimate goal';
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Goal creation failed: ${errorMessage}`,
        cause: error,
      });
    }
  });

// Update schema that includes the id field
const updateUltimateGoalSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  deadlineISO: z.string().min(1, 'Deadline is required'),
  category: z.string().optional(),
  targetValue: z.number().default(100),
  unit: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  color: z.string().optional(),
  coverImage: z.string().optional()
}).transform((data) => {
  return {
    ...data,
    deadline: data.deadlineISO,
    description: data.description || ''
  };
});

type UpdateUltimateGoalInput = z.infer<typeof updateUltimateGoalSchema>;

// Update goal procedure that replaces old tasks with new ones
export const updateUltimateGoalProcedure = protectedProcedure
  .input(updateUltimateGoalSchema)
  .mutation(async ({ input, ctx }: { input: UpdateUltimateGoalInput; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { goalId, ...updateData } = input;
    
    try {
      console.log('Updating ultimate goal with full plan regeneration...');
      
      // 1. Verify ownership and update the goal
      const { data: goalData, error: goalError } = await ctx.supabase
        .from('goals')
        .update({
          title: updateData.title,
          description: updateData.description,
          deadline: new Date(updateData.deadline).toISOString(),
          category: updateData.category || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
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
      
      // 2. Delete ALL existing tasks for this goal
      const { error: deleteTasksError } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_id', goalId);
        
      if (deleteTasksError) {
        console.warn('Error deleting existing tasks:', deleteTasksError);
      } else {
        console.log('Successfully deleted all existing tasks for goal');
      }
      
      // 3. Get user profile for experience level
      const { data: userProfile } = await ctx.supabase
        .from('profiles')
        .select('experience_level')
        .eq('id', user.id)
        .single();
        
      const experienceLevel = userProfile?.experience_level || 'beginner';
      
      // 4. Re-seed with new plan
      const planResult = await planAndSeedFullGoal(
        user.id,
        goalData.id,
        updateData.title,
        updateData.description,
        updateData.deadline,
        experienceLevel,
        0 // timezone offset
      );
      
      if (!planResult.success) {
        console.warn('Plan re-seeding failed:', planResult.error);
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
        seeded: planResult.success,
        summary: planResult.summary,
        error: planResult.error
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