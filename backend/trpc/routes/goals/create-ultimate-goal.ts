import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
import { calculateDaysToDeadline } from '../../../../utils/streakUtils';
import { GoalPlannerService } from '../../../services/goalPlanner';

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
    const planner = new GoalPlannerService();
    
    // Calculate days before starting
    const daysToDeadline = calculateDaysToDeadline(input.deadline);
    
    // Log before starting
    console.log('=== GOAL CREATION START ===');
    console.log(`User: ${user.id}`);
    console.log(`Goal: ${input.title}`);
    console.log(`Deadline: ${input.deadline}`);
    console.log(`Days: ${daysToDeadline}`);
    console.log('=== GOAL CREATION START ===');
    
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
      
      // 2. Generate full plan using the planning service
      console.log(`Generating full plan for ${daysToDeadline} days`);
      
      // Get user profile for experience level (fallback to 'beginner')
      const { data: userProfile } = await ctx.supabase
        .from('profiles')
        .select('experience_level')
        .eq('id', user.id)
        .single();
        
      const experienceLevel = userProfile?.experience_level || 'beginner';
      
      const fullPlan = await planner.generateFullPlan(
        input.title,
        input.description,
        input.deadline,
        experienceLevel,
        0 // timezone offset, can be enhanced later
      );
      
      console.log(`Plan generated with ${fullPlan.streak_habits.length} streak habits and ${fullPlan.daily_plan.length} daily plans`);
      
      // 3. Convert plan to database tasks
      const allTasks = planner.convertPlanToTasks(
        fullPlan,
        user.id,
        goalData.id,
        input.deadline
      );
      
      console.log(`Generated ${allTasks.length} total tasks for insertion`);
      console.log(`Streak tasks: ${allTasks.filter(t => t.type === 'streak').length}`);
      console.log(`Today tasks: ${allTasks.filter(t => t.type === 'today').length}`);
      
      // 4. Insert all tasks using a single transaction
      let insertResult;
      try {
        insertResult = await planner.insertTasksBatch(ctx.supabase, allTasks);
        console.log(`Task insertion completed: ${insertResult.success} success, ${insertResult.failed} failed`);
        
        if (insertResult.failed > 0) {
          console.warn(`Warning: ${insertResult.failed} tasks failed to insert`);
        }
      } catch (insertError) {
        console.error('Task insertion failed completely:', insertError);
        // Don't fail the entire goal creation if task insertion fails
        insertResult = { success: 0, failed: allTasks.length };
      }
      
      // 5. Verify the insertion by counting tasks in database
      const { count: streakCount } = await ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id)
        .eq('type', 'streak');
        
      const { count: todayCount } = await ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id)
        .eq('type', 'today');
        
      console.log(`Final verification: ${streakCount} streak tasks and ${todayCount} today tasks in database`);
      
      // Log after completion
      console.log('=== GOAL CREATION COMPLETE ===');
      console.log(`Goal ID: ${goalData.id}`);
      console.log(`Days: ${daysToDeadline}`);
      console.log(`Streak count: ${streakCount || 0}`);
      console.log(`Today count: ${todayCount || 0}`);
      console.log(`Expected streak tasks: ${daysToDeadline * fullPlan.streak_habits.length}`);
      console.log(`Tasks inserted: ${insertResult.success}`);
      console.log(`Tasks failed: ${insertResult.failed}`);
      console.log('=== GOAL CREATION COMPLETE ===');
      
      // 6. Return the created goal with metadata
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
        streakTasksCreated: streakCount || 0,
        todayTasksCreated: todayCount || 0,
        totalDays: daysToDeadline,
        daysToDeadline,
        fullPlanGenerated: true,
        tasksInserted: insertResult.success,
        tasksFailed: insertResult.failed,
        expectedStreakTasks: daysToDeadline * fullPlan.streak_habits.length,
        streakHabitsCount: fullPlan.streak_habits.length
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

// Update goal procedure that replaces old tasks with new ones
export const updateUltimateGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema.extend({ id: z.string() }))
  .mutation(async ({ input, ctx }: { input: CreateUltimateGoalInput & { id: string }; ctx: ProtectedContext }) => {
    const user = ctx.user;
    const { id, ...updateData } = input;
    const planner = new GoalPlannerService();
    
    try {
      console.log('Updating ultimate goal with full plan regeneration...');
      
      // 1. Update the goal
      const { data: goalData, error: goalError } = await ctx.supabase
        .from('goals')
        .update({
          title: updateData.title,
          description: updateData.description,
          deadline: new Date(updateData.deadline).toISOString(),
          category: updateData.category || null,
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
      } else {
        console.log('Successfully deleted all existing tasks for goal');
      }
      
      // 3. Generate new full plan using the planning service
      const daysToDeadline = calculateDaysToDeadline(updateData.deadline);
      console.log(`Regenerating full plan for ${daysToDeadline} days`);
      
      // Get user profile for experience level (fallback to 'beginner')
      const { data: userProfile } = await ctx.supabase
        .from('profiles')
        .select('experience_level')
        .eq('id', user.id)
        .single();
        
      const experienceLevel = userProfile?.experience_level || 'beginner';
      
      const fullPlan = await planner.generateFullPlan(
        updateData.title,
        updateData.description,
        updateData.deadline,
        experienceLevel,
        0 // timezone offset
      );
      
      console.log(`Plan regenerated with ${fullPlan.streak_habits.length} streak habits and ${fullPlan.daily_plan.length} daily plans`);
      
      // 4. Convert plan to database tasks
      const allTasks = planner.convertPlanToTasks(
        fullPlan,
        user.id,
        goalData.id,
        updateData.deadline
      );
      
      // 5. Insert all new tasks in batches
      const insertResult = await planner.insertTasksBatch(ctx.supabase, allTasks);
      
      console.log(`Task insertion completed: ${insertResult.success} success, ${insertResult.failed} failed`);
      
      // 6. Verify the insertion by counting tasks in database
      const { count: streakCount } = await ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id)
        .eq('type', 'streak');
        
      const { count: todayCount } = await ctx.supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id)
        .eq('type', 'today');
        
      console.log(`Final verification: ${streakCount} streak tasks and ${todayCount} today tasks in database`);
      
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
        streakTasksCreated: streakCount || 0,
        todayTasksCreated: todayCount || 0,
        totalDays: daysToDeadline,
        daysToDeadline,
        fullPlanRegenerated: true,
        tasksInserted: insertResult.success,
        tasksFailed: insertResult.failed
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