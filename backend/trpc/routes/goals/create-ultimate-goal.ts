import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { supabase } from '../../../../lib/supabase';
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

export const createUltimateGoalProcedure = protectedProcedure
  .input(createUltimateGoalSchema)
  .mutation(async ({ input, ctx }) => {
    const { user } = ctx;
    
    try {
      // 1. Create the goal first
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description,
          deadline: new Date(input.deadline).toISOString()
        })
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
        category: input.category,
        milestones: [],
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
            due_date: null // streak tasks use task_date instead
          });
        }
      }
      
      // 4. Batch insert all streak tasks
      if (streakTasks.length > 0) {
        // Insert in smaller batches to avoid potential issues
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < streakTasks.length; i += batchSize) {
          const batch = streakTasks.slice(i, i + batchSize);
          
          const { error: tasksError } = await supabase
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
        daysToDeadline
      };
      
    } catch (error) {
      console.error('Error in createUltimateGoal:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create ultimate goal');
    }
  });