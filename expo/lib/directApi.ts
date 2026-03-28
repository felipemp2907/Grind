import { supabase, getCurrentUser, ensureUserProfile } from '@/lib/supabase';

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
export async function createGoalDirect(_goalData: CreateGoalRequest): Promise<CreateGoalResponse> {
  throw new Error('createGoalDirect deprecated. Use trpcClient.goals.createUltimate.mutate(...) instead.');
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