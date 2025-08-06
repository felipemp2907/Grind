import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../../create-context';
import { buildStreakTemplate, calculateDaysToDeadline } from '../../../../utils/streakUtils';
import { generateFullGoalPlan } from '../../../../utils/aiUtils';

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
      console.log('Updating ultimate goal with full plan regeneration...');
      
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
      
      console.log('Deleted all existing tasks, regenerating full plan...');
      
      // 3. Generate new full plan using AI
      const daysToDeadline = calculateDaysToDeadline(updateData.deadline);
      console.log(`Regenerating full plan for ${daysToDeadline} days`);
      
      let fullPlan;
      try {
        // Get user profile for experience level (fallback to 'beginner')
        const { data: userProfile } = await ctx.supabase
          .from('profiles')
          .select('experience_level')
          .eq('id', user.id)
          .single();
          
        const experienceLevel = userProfile?.experience_level || 'beginner';
        
        fullPlan = await generateFullGoalPlan(
          updateData.title,
          updateData.description,
          updateData.deadline,
          experienceLevel,
          0 // timezone offset
        );
        
        console.log(`AI regenerated plan with ${fullPlan.streak_habits.length} streak habits and ${fullPlan.daily_plan.length} daily plans`);
      } catch (aiError) {
        console.error('AI plan regeneration failed, using fallback:', aiError);
        
        // Fallback to basic streak template
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
        
        // Create fallback plan
        fullPlan = {
          streak_habits: limitedStreakTemplate.map(item => ({
            title: item.title,
            description: item.description,
            load: Math.min(item.xpValue / 10, 3),
            proof: 'realtime' as const
          })),
          daily_plan: [] // No today tasks in fallback
        };
      }
      
      // 4. Create all tasks from the new full plan
      const allTasks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create streak tasks for every day
      for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Add streak habits for this day
        for (const habit of fullPlan.streak_habits) {
          allTasks.push({
            user_id: user.id,
            goal_id: goalData.id,
            title: habit.title,
            description: habit.description,
            type: 'streak',
            task_date: dateString,
            is_habit: true,
            xp_value: Math.max(10, habit.load * 10),
            priority: habit.load >= 3 ? 'high' : habit.load >= 2 ? 'medium' : 'low',
            completed: false,
            due_date: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // Add today tasks from daily plan
      for (const dayPlan of fullPlan.daily_plan) {
        const planDate = new Date(dayPlan.date);
        if (planDate >= today && planDate <= new Date(updateData.deadline)) {
          for (const task of dayPlan.today_tasks) {
            allTasks.push({
              user_id: user.id,
              goal_id: goalData.id,
              title: task.title,
              description: task.desc,
              type: 'today',
              task_date: null,
              is_habit: false,
              xp_value: Math.max(10, task.load * 10),
              priority: task.load >= 3 ? 'high' : task.load >= 2 ? 'medium' : 'low',
              completed: false,
              due_date: new Date(dayPlan.date + 'T12:00:00.000Z').toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      // 5. Batch insert all new tasks
      let totalInserted = 0;
      if (allTasks.length > 0) {
        console.log(`Inserting ${allTasks.length} new tasks (streak + today)`);
        
        const batchSize = 100;
        for (let i = 0; i < allTasks.length; i += batchSize) {
          const batch = allTasks.slice(i, i + batchSize);
          
          const { error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch);
            
          if (tasksError) {
            console.error(`Error creating new tasks batch ${i}-${i + batch.length}:`, tasksError);
            break;
          } else {
            totalInserted += batch.length;
            console.log(`Successfully created batch ${i}-${i + batch.length} (${batch.length} tasks)`);
          }
        }
        
        console.log(`Successfully created ${totalInserted} new tasks after goal update`);
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
        streakTasksCreated: fullPlan.streak_habits.length * daysToDeadline,
        todayTasksCreated: fullPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0),
        totalDays: daysToDeadline,
        daysToDeadline,
        fullPlanRegenerated: true
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
      console.log('Creating ultimate goal with full plan generation...');
      
      // 1. Create the goal first
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
      
      console.log(`Goal created with ID: ${goalData.id}`);
      
      // 2. Generate full plan using AI
      const daysToDeadline = calculateDaysToDeadline(input.deadline);
      console.log(`Generating full plan for ${daysToDeadline} days`);
      
      let fullPlan;
      try {
        // Get user profile for experience level (fallback to 'beginner')
        const { data: userProfile } = await ctx.supabase
          .from('profiles')
          .select('experience_level')
          .eq('id', user.id)
          .single();
          
        const experienceLevel = userProfile?.experience_level || 'beginner';
        
        fullPlan = await generateFullGoalPlan(
          input.title,
          input.description,
          input.deadline,
          experienceLevel,
          0 // timezone offset, can be enhanced later
        );
        
        console.log(`AI generated plan with ${fullPlan.streak_habits.length} streak habits and ${fullPlan.daily_plan.length} daily plans`);
      } catch (aiError) {
        console.error('AI plan generation failed, using fallback:', aiError);
        
        // Fallback to basic streak template
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
        const limitedStreakTemplate = streakTemplate.slice(0, 3);
        
        // Create fallback plan
        fullPlan = {
          streak_habits: limitedStreakTemplate.map(item => ({
            title: item.title,
            description: item.description,
            load: Math.min(item.xpValue / 10, 3),
            proof: 'realtime' as const
          })),
          daily_plan: [] // No today tasks in fallback
        };
      }
      
      // 3. Delete any existing tasks for this goal
      const { error: deleteError } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id);
        
      if (deleteError) {
        console.warn('Error deleting existing tasks:', deleteError);
      }
      
      // 4. Create all tasks from the full plan
      const allTasks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create streak tasks for every day
      for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Add streak habits for this day
        for (const habit of fullPlan.streak_habits) {
          allTasks.push({
            user_id: user.id,
            goal_id: goalData.id,
            title: habit.title,
            description: habit.description,
            type: 'streak',
            task_date: dateString,
            is_habit: true,
            xp_value: Math.max(10, habit.load * 10),
            priority: habit.load >= 3 ? 'high' : habit.load >= 2 ? 'medium' : 'low',
            completed: false,
            due_date: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // Add today tasks from daily plan
      for (const dayPlan of fullPlan.daily_plan) {
        const planDate = new Date(dayPlan.date);
        if (planDate >= today && planDate <= new Date(input.deadline)) {
          for (const task of dayPlan.today_tasks) {
            allTasks.push({
              user_id: user.id,
              goal_id: goalData.id,
              title: task.title,
              description: task.desc,
              type: 'today',
              task_date: null,
              is_habit: false,
              xp_value: Math.max(10, task.load * 10),
              priority: task.load >= 3 ? 'high' : task.load >= 2 ? 'medium' : 'low',
              completed: false,
              due_date: new Date(dayPlan.date + 'T12:00:00.000Z').toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      // 5. Batch insert all tasks
      let totalInserted = 0;
      if (allTasks.length > 0) {
        console.log(`Inserting ${allTasks.length} total tasks (streak + today)`);
        
        const batchSize = 100;
        for (let i = 0; i < allTasks.length; i += batchSize) {
          const batch = allTasks.slice(i, i + batchSize);
          
          const { error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch);
            
          if (tasksError) {
            console.error(`Error creating tasks batch ${i}-${i + batch.length}:`, tasksError);
            break;
          } else {
            totalInserted += batch.length;
            console.log(`Successfully created batch ${i}-${i + batch.length} (${batch.length} tasks)`);
          }
        }
        
        console.log(`Successfully created ${totalInserted} out of ${allTasks.length} total tasks`);
      }
      
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
        streakTasksCreated: fullPlan.streak_habits.length * daysToDeadline,
        todayTasksCreated: fullPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0),
        totalDays: daysToDeadline,
        daysToDeadline,
        fullPlanGenerated: true
      };
      
    } catch (error) {
      console.error('Error in createUltimateGoal:', error);
      
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