import { supabase, getCurrentUser, ensureUserProfile } from '@/lib/supabase';
import { createClientPlan, convertPlanToTasks } from '@/lib/clientPlanner';

export interface CreateGoalRequest {
  title: string;
  description: string;
  deadline: string;
  category?: string;
  targetValue?: number;
  unit?: string;
  priority?: 'high' | 'medium' | 'low';
  color?: string;
  coverImage?: string;
}

export interface CreateGoalResponse {
  success: boolean;
  goalId?: string;
  error?: string;
  seeded?: boolean;
  summary?: {
    goalId: string;
    days: number;
    streak_count: number;
    total_today: number;
    trimmed_days: number;
  };
}

// Direct goal creation without tRPC
export async function createGoalDirect(goalData: CreateGoalRequest): Promise<CreateGoalResponse> {
  try {
    console.log('🎯 Creating goal directly via Supabase...');
    
    // Get current user
    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError || !currentUser) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    // Ensure user profile exists
    const profileResult = await ensureUserProfile(currentUser.id, {
      name: currentUser.user_metadata?.name,
      email: currentUser.email
    });
    
    if (!profileResult.success) {
      console.warn('Profile creation failed, continuing anyway:', profileResult.error);
    }
    
    // Create the goal
    const goalInsertData = {
      user_id: currentUser.id,
      title: goalData.title,
      description: goalData.description || '',
      deadline: new Date(goalData.deadline).toISOString(),
      status: 'active',
      category: goalData.category || null,
      target_value: goalData.targetValue || 100,
      unit: goalData.unit || '',
      color: goalData.color || null,
      cover_image: goalData.coverImage || null,
      priority: goalData.priority || 'medium'
    };
    
    const { data: goalData_db, error: goalError } = await supabase
      .from('goals')
      .insert(goalInsertData)
      .select()
      .single();
      
    if (goalError) {
      console.error('❌ Error creating goal:', goalError);
      return {
        success: false,
        error: `Failed to create goal: ${goalError.message}`
      };
    }
    
    if (!goalData_db) {
      return {
        success: false,
        error: 'Goal creation returned no data'
      };
    }
    
    console.log(`✅ Goal created with ID: ${goalData_db.id}`);
    
    // Generate tasks using client planner
    try {
      console.log('🤖 Generating tasks with client planner...');
      const clientPlan = createClientPlan({
        title: goalData.title,
        description: goalData.description || '',
        deadline: goalData.deadline
      });
      
      const tasks = convertPlanToTasks(clientPlan, goalData_db.id);
      
      // Insert tasks into database
      const tasksToInsert = tasks.map(task => ({
        user_id: currentUser.id,
        goal_id: goalData_db.id,
        title: task.title,
        description: task.description,
        type: task.type,
        task_date: task.type === 'streak' ? task.date : null,
        due_at: task.type === 'today' ? new Date(`${task.date}T18:00:00`).toISOString() : null,
        load_score: Math.floor(task.xpValue / 10) || 1, // Convert XP back to load score
        proof_mode: task.proofRequired ? 'realtime' : 'flex',
        scheduled_for_date: task.date,
        xp_value: task.xpValue || 10,
        is_habit: task.isHabit || false,
        priority: task.priority || 'medium'
      }));
      
      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);
          
        if (tasksError) {
          console.error('❌ Error inserting tasks:', tasksError);
          // Don't fail the whole operation, goal was created successfully
        } else {
          console.log(`✅ Successfully inserted ${tasksToInsert.length} tasks`);
        }
      } else {
        console.log('No tasks to insert');
      }
      
      return {
        success: true,
        goalId: goalData_db.id,
        seeded: true,
        summary: {
          goalId: goalData_db.id,
          days: clientPlan.daily_plan.length,
          streak_count: clientPlan.streak_habits.length,
          total_today: clientPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0),
          trimmed_days: 0
        }
      };
      
    } catch (planError) {
      console.error('❌ Error generating tasks:', planError);
      // Goal was created successfully, just task generation failed
      return {
        success: true,
        goalId: goalData_db.id,
        seeded: false,
        error: 'Goal created but task generation failed'
      };
    }
    
  } catch (error) {
    console.error('❌ Error in createGoalDirect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get tasks for a specific date
export async function getTasksForDate(date: string): Promise<{
  success: boolean;
  streakTasks?: any[];
  todayTasks?: any[];
  error?: string;
}> {
  try {
    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError || !currentUser) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    // Get streak tasks for the date
    const { data: streakTasks, error: streakError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('type', 'streak')
      .eq('task_date', date);
      
    // Get today tasks for the date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    
    const { data: todayTasks, error: todayError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('type', 'today')
      .gte('due_at', startOfDay.toISOString())
      .lte('due_at', endOfDay.toISOString());
      
    if (streakError || todayError) {
      console.error('Error fetching tasks:', { streakError, todayError });
      return {
        success: false,
        error: 'Failed to fetch tasks'
      };
    }
    
    return {
      success: true,
      streakTasks: streakTasks || [],
      todayTasks: todayTasks || []
    };
    
  } catch (error) {
    console.error('Error in getTasksForDate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Update task completion status
export async function updateTaskCompletion(taskId: string, completed: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError || !currentUser) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    const updateData: any = {
      completed,
      status: completed ? 'completed' : 'pending',
      updated_at: new Date().toISOString()
    };
    
    if (completed) {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
    
    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', currentUser.id);
      
    if (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: 'Failed to update task'
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error in updateTaskCompletion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get all goals for current user
export async function getUserGoals(): Promise<{
  success: boolean;
  goals?: any[];
  error?: string;
}> {
  try {
    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError || !currentUser) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
      
    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return {
        success: false,
        error: 'Failed to fetch goals'
      };
    }
    
    return {
      success: true,
      goals: goals || []
    };
    
  } catch (error) {
    console.error('Error in getUserGoals:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}