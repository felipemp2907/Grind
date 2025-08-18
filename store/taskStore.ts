import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Remove randomUUID import as we'll let Supabase generate UUIDs
import { Task } from '@/types';

import { useUserStore } from '@/store/userStore';
import { supabase, setupDatabase, serializeError, ensureUserProfile } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface TaskState {
  tasks: Task[];
  
  // Task management
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string, journalEntryId: string) => Promise<void>;
  getTasks: (date: string) => Task[];
  getTasksByGoal: (date: string, goalId: string) => Task[];
  getTaskById: (id: string) => Task | undefined;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: () => Promise<void>;

  resetStreak: (id: string) => void;
  
  // Task rescheduling
  rescheduleTask: (taskId: string, newDate: string, newTime?: string) => void;
  rescheduleIncompleteTasks: (fromDate: string, toDate: string) => void;
  
  // Analytics
  getCompletionRate: (date: string) => number;
  getStreakTasks: (date: string) => Task[];
  getMissedTasks: (date: string) => Task[];
  
  // Reset
  resetTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      
      addTask: async (task: Omit<Task, 'id'>) => {
        // Save to Supabase first to get the proper UUID
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          // Ensure user profile exists
          const profileResult = await ensureUserProfile(user.id, {
            name: user.name,
            email: user.email
          });
          
          if (!profileResult.success) {
            console.error('Error ensuring profile exists:', profileResult.error);
            throw new Error(`Failed to create user profile: ${profileResult.error}`);
          }
          
          // Explicitly exclude the id field to let Supabase generate it
          const insertData = {
            user_id: user.id,
            goal_id: task.goalId || null,
            title: task.title,
            description: task.description,
            completed: task.completed,
            due_at: task.date && !task.isHabit ? new Date(task.date + 'T12:00:00.000Z').toISOString() : null,
            task_date: task.isHabit && task.date ? task.date : null, // For streak tasks
            type: task.isHabit ? 'streak' : 'today',
            priority: task.priority || 'medium',
            xp_value: task.xpValue || 30,
            is_habit: task.isHabit || false,
            streak: task.streak || 0,
            completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
            load_score: 1,
            proof_mode: 'flex'
          };
          
          console.log('Inserting task data:', insertData);
          
          const { data, error } = await supabase
            .from('tasks')
            .insert(insertData)
            .select()
            .single();
            
          if (error) {
            console.error('Error saving task to Supabase:', serializeError(error));
            return;
          }
          
          // Add to local state with the proper UUID from database
          if (data) {
            const taskWithUUID = {
              ...task,
              id: data.id
            };
            
            set((state) => ({ 
              tasks: [...state.tasks, taskWithUUID] 
            }));
          }
        } catch (error) {
          console.error('Error saving task:', serializeError(error));
        }
      },
      
      updateTask: async (id, updates) => {
        // Update local state first
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === id ? { ...task, ...updates } : task
          )
        }));
        
        // Update in Supabase
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const supabaseUpdates: any = {};
          if (updates.title !== undefined) supabaseUpdates.title = updates.title;
          if (updates.description !== undefined) supabaseUpdates.description = updates.description;
          if (updates.completed !== undefined) supabaseUpdates.completed = updates.completed;
          if (updates.date !== undefined) {
            // Update the appropriate date field based on task type
            const task = get().getTaskById(id);
            if (task?.isHabit) {
              supabaseUpdates.task_date = updates.date;
            } else {
              supabaseUpdates.due_at = updates.date ? new Date(updates.date + 'T12:00:00.000Z').toISOString() : null;
            }
          }
          if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
          if (updates.goalId !== undefined) supabaseUpdates.goal_id = updates.goalId;
          if (updates.xpValue !== undefined) supabaseUpdates.xp_value = updates.xpValue;
          if (updates.isHabit !== undefined) supabaseUpdates.is_habit = updates.isHabit;
          if (updates.streak !== undefined) supabaseUpdates.streak = updates.streak;
          if (updates.completedAt !== undefined) supabaseUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;
          
          const { error } = await supabase
            .from('tasks')
            .update(supabaseUpdates)
            .eq('id', id)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error updating task in Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error updating task:', serializeError(error));
        }
      },
      
      completeTask: async (id, journalEntryId) => {
        const task = get().getTaskById(id);
        if (!task) return;
        
        const updates = {
          completed: true,
          completedAt: new Date().toISOString(),
          journalEntryId,
          streak: task.isHabit ? task.streak + 1 : task.streak
        };
        
        // Update local state
        set((state) => ({
          tasks: state.tasks.map(t => 
            t.id === id ? { ...t, ...updates } : t
          )
        }));
        
        // Update in Supabase
        await get().updateTask(id, updates);
        
        // Add XP to user
        if (task.xpValue) {
          const { addXp } = useUserStore.getState();
          await addXp(task.xpValue);
        }
      },
      
      getTasks: (date) => {
        return get().tasks.filter(task => task.date === date);
      },
      
      getTasksByGoal: (date, goalId) => {
        return get().tasks.filter(task => 
          task.date === date && task.goalId === goalId
        );
      },
      
      getTaskById: (id) => {
        return get().tasks.find(task => task.id === id);
      },
      
      deleteTask: async (id) => {
        // Remove from local state
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== id)
        }));
        
        // Delete from Supabase
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error deleting task from Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error deleting task:', serializeError(error));
        }
      },
      
      resetStreak: (id) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id 
            ? { ...task, streak: 0 } 
            : task
        )
      })),
      
      rescheduleTask: (taskId, newDate, newTime) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                date: newDate,
                scheduledTime: newTime || task.scheduledTime,
                completed: false,
                completedAt: undefined,
                journalEntryId: undefined
              } 
            : task
        )
      })),
      
      rescheduleIncompleteTasks: (fromDate, toDate) => set((state) => ({
        tasks: state.tasks.map(task => {
          if (task.date === fromDate && !task.completed && !task.isHabit) {
            return {
              ...task,
              date: toDate,
              completed: false,
              completedAt: undefined,
              journalEntryId: undefined
            };
          }
          return task;
        })
      })),
      
      getCompletionRate: (date) => {
        const dayTasks = get().getTasks(date);
        if (dayTasks.length === 0) return 0;
        const completed = dayTasks.filter(task => task.completed).length;
        return completed / dayTasks.length;
      },
      
      getStreakTasks: (date) => {
        return get().getTasks(date).filter(task => task.isHabit);
      },
      
      getMissedTasks: (date) => {
        const today = new Date().toISOString().split('T')[0];
        if (date >= today) return []; // Can't have missed future tasks
        
        return get().getTasks(date).filter(task => !task.completed);
      },
      

      
      fetchTasks: async () => {
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) {
            console.log('User not authenticated, skipping tasks fetch');
            return;
          }
          
          // Quick database check without timeout to avoid hanging
          try {
            const dbResult = await setupDatabase();
            if (!dbResult.success) {
              console.log('Database not ready, skipping tasks fetch:', dbResult.error);
              return;
            }
          } catch (dbError) {
            console.log('Database check failed, continuing without tasks:', serializeError(dbError));
            return;
          }
          
          // Fetch tasks with abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          try {
            const { data, error } = await supabase
              .from('tasks')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(100) // Limit results to improve performance
              .abortSignal(controller.signal);
              
            clearTimeout(timeoutId);
            
            if (error) {
              console.log('Error fetching tasks, continuing without data:', serializeError(error));
              return;
            }
            
            if (data) {
              const tasks: Task[] = data.map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description || '',
                // For streak tasks, use task_date; for today tasks, use due_at or due_date as fallback
                date: task.task_date || (task.due_at ? task.due_at.split('T')[0] : (task.due_date ? task.due_date.split('T')[0] : new Date().toISOString().split('T')[0])),
                goalId: task.goal_id || '',
                completed: task.completed || false,
                xpValue: task.xp_value || 30,
                isHabit: task.is_habit || (task.type === 'streak'),
                streak: task.streak || 0,
                isUserCreated: true,
                requiresValidation: true,
                priority: task.priority as 'high' | 'medium' | 'low' || 'medium',
                completedAt: task.completed_at || undefined,
                type: task.type as 'today' | 'streak' || (task.is_habit ? 'streak' : 'today'),
                taskDate: task.task_date || undefined
              }));
              
              set({ tasks });
              console.log(`Successfully fetched ${tasks.length} tasks`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.log('Tasks fetch timed out, continuing without data');
            } else {
              console.log('Tasks fetch failed:', serializeError(fetchError));
            }
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.log('Tasks fetch error, continuing without data:', errorMessage);
        }
      },
      

      
      resetTasks: async () => {
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          // Delete all tasks from Supabase
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error deleting all tasks from Supabase:', serializeError(error));
          }
          
          // Clear local state
          set({ 
            tasks: []
          });
        } catch (error) {
          console.error('Error resetting tasks:', serializeError(error));
        }
      }
    }),
    {
      name: 'grind-task-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);