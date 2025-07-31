import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { supabase } from '../../../../lib/supabase';
import { getActiveGoalsForDate } from '../../../../utils/streakUtils';
import { generateDailyTasksForGoal } from '../../../../utils/aiUtils';

const generateTodayTasksSchema = z.object({
  targetDate: z.string().min(1, 'Target date is required'), // YYYY-MM-DD format
  goalId: z.string().optional() // If provided, generate only for this goal
});

type GenerateTodayTasksInput = z.infer<typeof generateTodayTasksSchema>;
type GenerateTodayTasksContext = { user: { id: string } };

interface AIGeneratedTask {
  title: string;
  description: string;
  isHabit: boolean;
  xpValue: number;
}

export const generateTodayTasksProcedure = protectedProcedure
  .input(generateTodayTasksSchema)
  .mutation(async ({ input, ctx }: { input: GenerateTodayTasksInput, ctx: GenerateTodayTasksContext }) => {
    const { user } = ctx;
    const { targetDate, goalId } = input;
    
    try {
      // 1. Get all user's goals
      const { data: allGoals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active'); // Only active goals
        
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        throw new Error(`Failed to fetch goals: ${goalsError.message}`);
      }
      
      if (!allGoals || allGoals.length === 0) {
        return {
          tasks: [],
          notice: 'No active goals found'
        };
      }
      
      // 2. Apply deadline guard - get active goals for target date
      const activeGoalsForDate = getActiveGoalsForDate(targetDate, allGoals.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description || '',
        deadline: g.deadline,
        category: g.category,
        milestones: [],
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        progressValue: 0,
        targetValue: 100,
        xpEarned: 0,
        streakCount: 0,
        todayTasksIds: [],
        streakTaskIds: [],
        status: 'active' as const
      })));
      
      if (activeGoalsForDate.length === 0) {
        return {
          tasks: [],
          notice: 'No active goals cover this date'
        };
      }
      
      // 3. Filter to specific goal if provided
      const goalsToProcess = goalId 
        ? activeGoalsForDate.filter(g => g.id === goalId)
        : activeGoalsForDate;
        
      if (goalsToProcess.length === 0) {
        return {
          tasks: [],
          notice: 'Specified goal is not active for this date'
        };
      }
      
      // 4. Check if tasks already exist for this date
      const targetDateISO = new Date(targetDate).toISOString().split('T')[0];
      const { data: existingTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'today')
        .gte('due_date', targetDateISO + 'T00:00:00.000Z')
        .lt('due_date', targetDateISO + 'T23:59:59.999Z');
        
      if (tasksError) {
        console.error('Error checking existing tasks:', tasksError);
        // Continue anyway
      }
      
      const existingTasksByGoal = (existingTasks || []).reduce((acc, task) => {
        if (!acc[task.goal_id]) acc[task.goal_id] = [];
        acc[task.goal_id].push(task);
        return acc;
      }, {} as Record<string, any[]>);
      
      // 5. Generate tasks for each goal that needs them
      const newTasks = [];
      
      for (const goal of goalsToProcess) {
        const existingForGoal = existingTasksByGoal[goal.id] || [];
        
        // Skip if already has enough tasks (3 per goal)
        if (existingForGoal.length >= 3) {
          console.log(`Goal ${goal.title} already has ${existingForGoal.length} tasks for ${targetDate}`);
          continue;
        }
        
        try {
          // Get previous completed tasks for context
          const { data: previousTasks } = await supabase
            .from('tasks')
            .select('title')
            .eq('user_id', user.id)
            .eq('goal_id', goal.id)
            .eq('completed', true)
            .order('completed_at', { ascending: false })
            .limit(10);
            
          const previousTaskTitles = (previousTasks || []).map(t => t.title);
          
          // Call AI to generate tasks
          let aiResponse: string;
          try {
            aiResponse = await generateDailyTasksForGoal(
              goal.title,
              goal.description,
              goal.deadline,
              previousTaskTitles,
              targetDate
            );
            console.log('Raw AI response:', aiResponse.substring(0, 200));
          } catch (aiError) {
            console.error('Error calling AI:', aiError);
            // Use fallback response
            aiResponse = JSON.stringify([
              {
                title: `Work on ${goal.title} - ${new Date(targetDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`,
                description: `Make progress on your goal: ${goal.description.substring(0, 50)}...`,
                isHabit: false,
                xpValue: 50
              },
              {
                title: `Research for ${goal.title}`,
                description: 'Gather information and resources to help you progress',
                isHabit: false,
                xpValue: 30
              },
              {
                title: `Plan next steps for ${goal.title}`,
                description: 'Create a detailed action plan',
                isHabit: false,
                xpValue: 25
              }
            ]);
          }
          
          // Parse AI response with improved error handling
          let aiTasks: AIGeneratedTask[] = [];
          try {
            // More robust JSON cleaning and parsing
            let cleanedResponse = aiResponse.trim();
            
            // Remove any HTML tags, markdown, or extra formatting
            cleanedResponse = cleanedResponse
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/```json\s*/g, '') // Remove markdown code block start
              .replace(/```\s*$/g, '') // Remove markdown code block end
              .replace(/```/g, '') // Remove any remaining backticks
              .replace(/^[^\[]*/, '') // Remove any text before the first [
              .replace(/[^\]]*$/, ']'); // Ensure it ends with ]
            
            // Find and extract JSON array
            const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (!arrayMatch) {
              throw new Error('No valid JSON array found in response');
            }
            
            const jsonToParse = arrayMatch[0];
            console.log('Attempting to parse JSON:', jsonToParse.substring(0, 200) + '...');
            
            const parsed = JSON.parse(jsonToParse);
            
            // Validate and normalize the parsed tasks
            if (!Array.isArray(parsed)) {
              throw new Error('Parsed result is not an array');
            }
            
            aiTasks = parsed.map((task: any) => ({
              title: String(task.title || 'Untitled Task'),
              description: String(task.description || 'No description'),
              isHabit: Boolean(task.isHabit || false),
              xpValue: Number(task.xpValue || task.xp_value || 30)
            }));
            
            console.log(`Successfully parsed ${aiTasks.length} AI tasks`);
            
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Raw response that failed to parse:', aiResponse.substring(0, 500));
            
            // Use fallback tasks with better error recovery
            aiTasks = [
              {
                title: `Work on ${goal.title} - ${new Date(targetDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`,
                description: `Make progress on your goal: ${goal.description.substring(0, 50)}...`,
                isHabit: false,
                xpValue: 50
              },
              {
                title: `Research for ${goal.title}`,
                description: 'Gather information and resources to help you progress',
                isHabit: false,
                xpValue: 30
              },
              {
                title: `Plan next steps for ${goal.title}`,
                description: 'Create a detailed action plan',
                isHabit: false,
                xpValue: 25
              }
            ];
            
            console.log('Using fallback tasks due to parsing error');
          }
          
          // Filter only today tasks (not habits) and limit to what we need
          const todayTasks = aiTasks
            .filter(task => !task.isHabit)
            .slice(0, Math.max(0, 3 - existingForGoal.length));
          
          // Create task objects
          for (const aiTask of todayTasks) {
            newTasks.push({
              user_id: user.id,
              goal_id: goal.id,
              title: aiTask.title,
              description: aiTask.description,
              type: 'today',
              task_date: null, // today tasks don't use task_date
              due_date: new Date(targetDate + 'T12:00:00.000Z').toISOString(),
              is_habit: false,
              xp_value: aiTask.xpValue || 30,
              priority: 'medium',
              completed: false
            });
          }
          
        } catch (error) {
          console.error(`Error generating tasks for goal ${goal.title}:`, error);
          // Continue with other goals
        }
      }
      
      // 6. Insert new tasks
      if (newTasks.length > 0) {
        const { data: insertedTasks, error: insertError } = await supabase
          .from('tasks')
          .insert(newTasks)
          .select();
          
        if (insertError) {
          console.error('Error inserting tasks:', insertError);
          throw new Error(`Failed to create tasks: ${insertError.message}`);
        }
        
        return {
          tasks: insertedTasks || [],
          notice: `Generated ${newTasks.length} new tasks`
        };
      }
      
      return {
        tasks: [],
        notice: 'All goals already have sufficient tasks for this date'
      };
      
    } catch (error) {
      console.error('Error in generateTodayTasks:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate today tasks');
    }
  });