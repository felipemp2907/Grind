import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
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
      
        // Validate the plan structure
        if (!fullPlan.streak_habits || !Array.isArray(fullPlan.streak_habits)) {
          console.warn('Invalid streak_habits in AI plan, using fallback');
          throw new Error('Invalid AI plan structure');
        }
        if (!fullPlan.daily_plan || !Array.isArray(fullPlan.daily_plan)) {
          console.warn('Invalid daily_plan in AI plan, using fallback');
          throw new Error('Invalid AI plan structure');
        }
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
        console.log(`Breakdown: ${allTasks.filter(t => t.type === 'streak').length} streak tasks, ${allTasks.filter(t => t.type === 'today').length} today tasks`);
        
        const batchSize = 100;
        for (let i = 0; i < allTasks.length; i += batchSize) {
          const batch = allTasks.slice(i, i + batchSize);
          
          const { data: insertedData, error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch)
            .select('id, type, task_date, due_date');
            
          if (tasksError) {
            console.error(`Error creating new tasks batch ${i}-${i + batch.length}:`, tasksError);
            console.error('Sample task from failed batch:', JSON.stringify(batch[0], null, 2));
            break;
          } else {
            totalInserted += batch.length;
            console.log(`Successfully created batch ${i}-${i + batch.length} (${batch.length} tasks)`);
            if (insertedData && insertedData.length > 0) {
              console.log(`Sample inserted task:`, insertedData[0]);
            }
          }
        }
        
        console.log(`Successfully created ${totalInserted} new tasks after goal update`);
        
        // Verify the insertion by counting tasks in database
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
          
        console.log(`Verification: ${streakCount} streak tasks and ${todayCount} today tasks in database`);
      } else {
        console.warn('No tasks to insert - this should not happen!');
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
      console.log('🎯 Creating ultimate goal with FULL PLAN generation...');
      console.log(`Goal: "${input.title}" | Deadline: ${input.deadline}`);
      
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
        console.error('❌ Error creating goal:', goalError);
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
      
      console.log(`✅ Goal created with ID: ${goalData.id}`);
      
      // 2. Calculate timeline and generate COMPLETE plan
      const daysToDeadline = calculateDaysToDeadline(input.deadline);
      console.log(`📅 Generating COMPLETE plan for ${daysToDeadline} days (today → deadline)`);
      
      let fullPlan;
      try {
        // Get user profile for experience level (fallback to 'beginner')
        const { data: userProfile } = await ctx.supabase
          .from('profiles')
          .select('experience_level')
          .eq('id', user.id)
          .single();
          
        const experienceLevel = userProfile?.experience_level || 'beginner';
        console.log(`👤 User experience level: ${experienceLevel}`);
        
        console.log('🤖 Calling AI to generate full goal plan...');
        fullPlan = await generateFullGoalPlan(
          input.title,
          input.description,
          input.deadline,
          experienceLevel,
          0 // timezone offset, can be enhanced later
        );
        
        console.log(`🎉 AI generated plan:`);
        console.log(`   • ${fullPlan.streak_habits.length} streak habits (will repeat every day)`);
        console.log(`   • ${fullPlan.daily_plan.length} daily plans with today tasks`);
        console.log(`   • Total today tasks: ${fullPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0)}`);
      
        // Validate the plan structure
        if (!fullPlan.streak_habits || !Array.isArray(fullPlan.streak_habits)) {
          console.warn('⚠️ Invalid streak_habits in AI plan, using fallback');
          throw new Error('Invalid AI plan structure');
        }
        if (!fullPlan.daily_plan || !Array.isArray(fullPlan.daily_plan)) {
          console.warn('⚠️ Invalid daily_plan in AI plan, using fallback');
          throw new Error('Invalid AI plan structure');
        }
      } catch (aiError) {
        console.error('❌ AI plan generation failed, using fallback:', aiError);
        
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
        
        console.log(`🔄 Using fallback plan with ${limitedStreakTemplate.length} streak habits`);
        
        // Create fallback plan
        fullPlan = {
          streak_habits: limitedStreakTemplate.map(item => ({
            title: item.title,
            description: item.description,
            load: Math.min(item.xpValue / 10, 3),
            proof: 'flex' as const
          })),
          daily_plan: [] // No today tasks in fallback
        };
      }
      
      // 3. Delete any existing tasks for this goal (cleanup)
      const { error: deleteError } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('goal_id', goalData.id);
        
      if (deleteError) {
        console.warn('⚠️ Error deleting existing tasks:', deleteError);
      }
      
      // 4. Create ALL TASKS for the ENTIRE timeline
      console.log('📝 Creating ALL tasks for the entire timeline...');
      const allTasks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create streak tasks for EVERY SINGLE DAY until deadline
      console.log(`🔄 Creating streak tasks for ${daysToDeadline} days...`);
      for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Add ALL streak habits for this day
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
      
      // Add today tasks from daily plan (each task appears only on its assigned day)
      console.log(`📋 Adding today tasks from daily plan...`);
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
      
      // 5. BATCH INSERT ALL TASKS AT ONCE
      let totalInserted = 0;
      const streakTaskCount = allTasks.filter(t => t.type === 'streak').length;
      const todayTaskCount = allTasks.filter(t => t.type === 'today').length;
      
      console.log(`💾 BATCH INSERTING ${allTasks.length} total tasks:`);
      console.log(`   • ${streakTaskCount} streak tasks (${fullPlan.streak_habits.length} habits × ${daysToDeadline} days)`);
      console.log(`   • ${todayTaskCount} today tasks (distributed across timeline)`);
      
      if (allTasks.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < allTasks.length; i += batchSize) {
          const batch = allTasks.slice(i, i + batchSize);
          
          const { data: insertedData, error: tasksError } = await ctx.supabase
            .from('tasks')
            .insert(batch)
            .select('id, type, task_date, due_date');
            
          if (tasksError) {
            console.error(`❌ Error creating tasks batch ${i}-${i + batch.length}:`, tasksError);
            console.error('Sample task from failed batch:', JSON.stringify(batch[0], null, 2));
            break;
          } else {
            totalInserted += batch.length;
            console.log(`✅ Successfully created batch ${i}-${i + batch.length} (${batch.length} tasks)`);
            if (insertedData && insertedData.length > 0) {
              console.log(`   Sample inserted task:`, insertedData[0]);
            }
          }
        }
        
        console.log(`🎉 SUCCESSFULLY CREATED ${totalInserted} out of ${allTasks.length} total tasks`);
        
        // Verify the insertion by counting tasks in database
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
          
        console.log(`🔍 DATABASE VERIFICATION:`);
        console.log(`   • ${streakCount} streak tasks in database`);
        console.log(`   • ${todayCount} today tasks in database`);
        console.log(`   • Expected: ${streakTaskCount} streak + ${todayTaskCount} today = ${streakTaskCount + todayTaskCount} total`);
        
        if ((streakCount || 0) + (todayCount || 0) !== allTasks.length) {
          console.warn(`⚠️ MISMATCH: Expected ${allTasks.length} tasks, but database has ${(streakCount || 0) + (todayCount || 0)}`);
        } else {
          console.log(`✅ PERFECT MATCH: All ${allTasks.length} tasks successfully created!`);
        }
      } else {
        console.error('❌ NO TASKS TO INSERT - This should NEVER happen!');
      }
      
      // 6. Return the created goal with comprehensive metadata
      const result = {
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
        streakTasksCreated: streakTaskCount,
        todayTasksCreated: todayTaskCount,
        totalTasksCreated: totalInserted,
        totalDays: daysToDeadline,
        daysToDeadline,
        fullPlanGenerated: true,
        streakHabitsCount: fullPlan.streak_habits.length,
        dailyPlansCount: fullPlan.daily_plan.length
      };
      
      console.log(`🎯 ULTIMATE GOAL CREATION COMPLETE!`);
      console.log(`   Goal: "${input.title}"`);
      console.log(`   Timeline: ${daysToDeadline} days`);
      console.log(`   Streak habits: ${fullPlan.streak_habits.length}`);
      console.log(`   Total tasks created: ${totalInserted}`);
      console.log(`   ✅ User now has a COMPLETE plan from today to deadline!`);
      
      return result;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in createUltimateGoal:', error);
      
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