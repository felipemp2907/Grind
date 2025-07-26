import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Task } from '@/types';
import { generateDailyTasksForGoal, generateDailyAgenda } from '@/utils/aiUtils';
import { useGoalStore } from '@/store/goalStore';
import { useUserStore } from '@/store/userStore';
import { supabase, setupDatabase, serializeError, ensureUserProfile } from '@/lib/supabase';
import { useAuthStore } from './authStore';

// Interface for tasks returned from AI
interface AIGeneratedTask {
  title: string;
  description: string;
  isHabit: boolean;
  xpValue: number;
}

// Interface for agenda tasks
interface AgendaTask {
  title: string;
  description: string;
  xpValue: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

// Interface for daily agenda
interface DailyAgenda {
  date: string;
  tasks: AgendaTask[];
  motivation: string;
  status: 'pending' | 'accepted' | 'regenerated';
  createdAt: string;
}

interface TaskState {
  tasks: Task[];
  dailyAgendas: DailyAgenda[];
  isGenerating: boolean;
  isGeneratingAgenda: boolean;
  
  // Task management
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string, journalEntryId: string) => Promise<void>;
  getTasks: (date: string) => Task[];
  getTasksByGoal: (date: string, goalId: string) => Task[];
  getTaskById: (id: string) => Task | undefined;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  generateDailyTasks: (date: string) => Promise<void>;
  generateTasksForGoal: (date: string, goalId: string) => Promise<void>;
  setIsGenerating: (isGenerating: boolean) => void;
  resetStreak: (id: string) => void;
  
  // Agenda management
  generateDailyAgenda: (date: string) => Promise<void>;
  acceptAgenda: (date: string) => Promise<void>;
  regenerateAgenda: (date: string) => Promise<void>;
  getAgenda: (date: string) => DailyAgenda | undefined;
  
  // Task rescheduling
  rescheduleTask: (taskId: string, newDate: string, newTime?: string) => void;
  rescheduleIncompleteTasks: (fromDate: string, toDate: string) => void;
  
  // Analytics
  getCompletionRate: (date: string) => number;
  getStreakTasks: (date: string) => Task[];
  getMissedTasks: (date: string) => Task[];
  
  // AI Suggestions
  generateAISuggestions: (date: string, goalId?: string) => Promise<void>;
  canAddMoreTasks: (date: string, goalId?: string) => { canAddToday: boolean; canAddHabits: boolean; todayCount: number; habitCount: number };
  
  // Reset
  resetTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      dailyAgendas: [],
      isGenerating: false,
      isGeneratingAgenda: false,
      
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
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
            due_date: task.date ? new Date(task.date).toISOString() : null,
            priority: task.priority || 'medium',
            xp_value: task.xpValue || 30,
            is_habit: task.isHabit || false,
            streak: task.streak || 0,
            completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null
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
          if (updates.date !== undefined) supabaseUpdates.due_date = updates.date ? new Date(updates.date).toISOString() : null;
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
      
      // Generate daily agenda (proactive morning plan)
      generateDailyAgenda: async (date) => {
        const { goals, activeGoalId } = useGoalStore.getState();
        const { coachSettings } = useUserStore.getState();
        
        const activeGoal = goals.find((g: any) => g.id === activeGoalId) || goals[0];
        if (!activeGoal) return;
        
        // Check if agenda already exists for this date
        const existingAgenda = get().dailyAgendas.find(a => a.date === date);
        if (existingAgenda && existingAgenda.status !== 'regenerated') return;
        
        set({ isGeneratingAgenda: true });
        
        try {
          // Get recent completed tasks for context
          const recentTasks = get().tasks
            .filter(task => task.goalId === activeGoal.id && task.completed)
            .slice(-10)
            .map(task => task.title);
          
          const agendaData = await generateDailyAgenda(
            activeGoal.title,
            activeGoal.description,
            recentTasks,
            date,
            coachSettings.preferredTone
          );
          
          const newAgenda: DailyAgenda = {
            date,
            tasks: agendaData.tasks,
            motivation: agendaData.motivation,
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          
          set((state) => ({
            dailyAgendas: [
              ...state.dailyAgendas.filter(a => a.date !== date),
              newAgenda
            ]
          }));
          
        } catch (error) {
          console.error('Error generating daily agenda:', error);
        } finally {
          set({ isGeneratingAgenda: false });
        }
      },
      
      acceptAgenda: async (date) => {
        const agenda = get().getAgenda(date);
        if (!agenda) return;
        
        const { goals, activeGoalId } = useGoalStore.getState();
        const activeGoal = goals.find((g: any) => g.id === activeGoalId) || goals[0];
        if (!activeGoal) return;
        
        // Convert agenda tasks to actual tasks (limit to 3)
        const newTasks: Omit<Task, 'id'>[] = agenda.tasks.slice(0, 3).map((agendaTask, index) => ({
          title: agendaTask.title,
          description: agendaTask.description,
          date,
          goalId: activeGoal.id,
          completed: false,
          xpValue: agendaTask.xpValue,
          isHabit: false,
          streak: 0,
          isUserCreated: false,
          requiresValidation: true,
          priority: agendaTask.priority,
          estimatedTime: agendaTask.estimatedTime
        }));
        
        // Add tasks and mark agenda as accepted
        for (const task of newTasks) {
          await get().addTask(task);
        }
        
        set((state) => ({
          dailyAgendas: state.dailyAgendas.map(a => 
            a.date === date ? { ...a, status: 'accepted' as const } : a
          )
        }));
      },
      
      regenerateAgenda: async (date) => {
        // Mark current agenda as regenerated and create new one
        set((state) => ({
          dailyAgendas: state.dailyAgendas.map(a => 
            a.date === date ? { ...a, status: 'regenerated' as const } : a
          )
        }));
        
        await get().generateDailyAgenda(date);
      },
      
      getAgenda: (date) => {
        return get().dailyAgendas.find(a => a.date === date);
      },
      
      // Generate tasks for all goals
      generateDailyTasks: async (date) => {
        const { goals } = useGoalStore.getState();
        set({ isGenerating: true });
        
        try {
          // Generate tasks for each goal
          const promises = goals.map((goal: any) => 
            get().generateTasksForGoal(date, goal.id)
          );
          
          await Promise.all(promises);
        } catch (error) {
          console.error('Error generating daily tasks:', error);
        } finally {
          set({ isGenerating: false });
        }
      },
      
      // Generate tasks for a specific goal
      generateTasksForGoal: async (date, goalId) => {
        const { goals } = useGoalStore.getState();
        const goal = goals.find((g: any) => g.id === goalId);
        
        if (!goal) return;
        
        // Check if tasks already exist for this goal and date
        const existingTasks = get().tasks.filter(
          task => task.date === date && task.goalId === goalId
        );
        
        // Only generate new non-habit tasks if we don't have enough for this date
        // For habit tasks, we'll check individually
        const existingRegularTasks = existingTasks.filter(task => !task.isHabit);
        const existingHabitTasks = existingTasks.filter(task => task.isHabit);
        
        if (existingRegularTasks.length >= 3 && existingHabitTasks.length >= 3) {
          // If we already have enough tasks for this date, don't generate new ones
          // But we might still need to create habit tasks if they don't exist
          
          // Get existing habit tasks for this goal
          const habitTasks = get().tasks.filter(
            task => task.goalId === goalId && task.isHabit
          );
          
          // If we have habit tasks but none for this date and we need more, create copies for today
          if (habitTasks.length > 0 && existingHabitTasks.length < 3) {
            // Create copies of habit tasks for today (up to 3 total)
            const tasksToAdd = Math.min(3 - existingHabitTasks.length, habitTasks.length);
            const newHabitTasks = habitTasks.slice(0, tasksToAdd).map(habitTask => {
              const { id, ...taskWithoutId } = habitTask;
              return {
                ...taskWithoutId,
                date,
                completed: false,
                completedAt: undefined,
                journalEntryId: undefined
              };
            });
            
            // Add only the habit tasks
            for (const task of newHabitTasks) {
              await get().addTask(task);
            }
          }
          
          return;
        }
        
        try {
          set({ isGenerating: true });
          
          // Get previous tasks for this goal to provide context to AI
          const previousTasks = get().tasks
            .filter(task => task.goalId === goalId && task.completed)
            .map(task => task.title);
          
          // Call AI to generate tasks, passing the current date
          const aiResponse = await generateDailyTasksForGoal(
            goal.title,
            goal.description,
            goal.deadline,
            previousTasks,
            date
          );
          
          // Parse AI response
          let aiTasks: AIGeneratedTask[] = [];
          try {
            // Clean the response to handle potential markdown formatting
            const cleanedResponse = aiResponse
              .replace(/```json\s*/g, '')
              .replace(/```\s*$/g, '')
              .replace(/```/g, '')
              .trim();
              
            // Find JSON array in the response if it's not already a valid JSON
            let jsonToparse = cleanedResponse;
            if (!cleanedResponse.startsWith('[')) {
              const match = cleanedResponse.match(/\[[\s\S]*\]/);
              if (match) {
                jsonToparse = match[0];
              }
            }
            
            aiTasks = JSON.parse(jsonToparse);
          } catch (error) {
            console.error('Error parsing AI response:', error, 'Raw response:', aiResponse);
            // Fallback to default tasks if parsing fails
            aiTasks = [
              {
                title: `Work on ${goal.title} for ${new Date(date).toLocaleDateString('en-US', {weekday: 'long'})}`,
                description: `Make progress on your goal: ${goal.description.substring(0, 50)}...`,
                isHabit: false,
                xpValue: 50
              },
              {
                title: `Research for ${goal.title} - ${new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`,
                description: "Gather information and resources to help you progress",
                isHabit: false,
                xpValue: 30
              },
              {
                title: `Daily habit for ${goal.title}`,
                description: "Maintain your daily practice",
                isHabit: true,
                xpValue: 20
              }
            ];
          }
          
          // Separate today tasks and habit tasks, then limit each
          const todayTasks = aiTasks.filter(task => !task.isHabit).slice(0, 3);
          const habitTasks = aiTasks.filter(task => task.isHabit).slice(0, 3);
          const limitedTasks = [...todayTasks, ...habitTasks];
          
          // Create task objects from AI response
          const newTasks: Omit<Task, 'id'>[] = limitedTasks.map((aiTask: AIGeneratedTask, index: number) => ({
            title: aiTask.title,
            description: aiTask.description,
            date,
            goalId,
            completed: false,
            xpValue: aiTask.xpValue || Math.floor(Math.random() * 30) + 20, // 20-50 XP if not specified
            isHabit: aiTask.isHabit || false,
            streak: 0,
            isUserCreated: false,
            requiresValidation: true
          }));
          
          // Add tasks to store
          for (const task of newTasks) {
            await get().addTask(task);
          }
          
        } catch (error) {
          console.error('Error generating tasks for goal:', error);
          
          // Create fallback tasks if AI fails (limited to 3 today + 3 habits)
          const fallbackTasks: Omit<Task, 'id'>[] = [
            {
              title: `Work on ${goal.title} - ${new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`,
              description: `Make progress on your goal: ${goal.description.substring(0, 50)}...`,
              date,
              goalId,
              completed: false,
              xpValue: 50,
              isHabit: false,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true
            },
            {
              title: `Research for ${goal.title}`,
              description: "Gather information and resources to help you progress",
              date,
              goalId,
              completed: false,
              xpValue: 30,
              isHabit: false,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true
            },
            {
              title: `Plan next steps for ${goal.title}`,
              description: "Create a detailed action plan for tomorrow",
              date,
              goalId,
              completed: false,
              xpValue: 25,
              isHabit: false,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true
            },
            {
              title: `Daily habit for ${goal.title}`,
              description: "Maintain your daily practice",
              date,
              goalId,
              completed: false,
              xpValue: 20,
              isHabit: true,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true
            }
          ];
          
          for (const task of fallbackTasks) {
            await get().addTask(task);
          }
        } finally {
          set({ isGenerating: false });
        }
      },
      
      fetchTasks: async () => {
        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tasks fetch timeout')), 8000);
        });
        
        try {
          const { user } = useAuthStore.getState();
          if (!user?.id) {
            console.log('User not authenticated, skipping tasks fetch');
            return;
          }
          
          const dbCheckPromise = setupDatabase();
          const dbResult = await Promise.race([dbCheckPromise, timeoutPromise]) as any;
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const tasksPromise = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          const { data, error } = await Promise.race([tasksPromise, timeoutPromise]) as any;
            
          if (error) {
            console.error('Error fetching tasks:', serializeError(error));
            return;
          }
          
          if (data) {
            const tasks: Task[] = data.map((task: any) => ({
              id: task.id,
              title: task.title,
              description: task.description || '',
              date: task.due_date ? task.due_date.split('T')[0] : new Date().toISOString().split('T')[0],
              goalId: task.goal_id || '',
              completed: task.completed || false,
              xpValue: task.xp_value || 30,
              isHabit: task.is_habit || false,
              streak: task.streak || 0,
              isUserCreated: true,
              requiresValidation: false,
              priority: task.priority as 'high' | 'medium' | 'low' || 'medium',
              completedAt: task.completed_at || undefined
            }));
            
            set({ tasks });
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.error('Error fetching tasks:', errorMessage);
          
          // If it's a timeout error, don't block the app
          if (errorMessage.includes('timeout')) {
            console.log('Tasks fetch timed out, continuing without tasks data');
            return;
          }
        }
      },
      
      // Check if more tasks can be added for a specific date and goal
      canAddMoreTasks: (date, goalId) => {
        const existingTasks = goalId 
          ? get().tasks.filter(task => task.date === date && task.goalId === goalId)
          : get().tasks.filter(task => task.date === date);
          
        const todayTasks = existingTasks.filter(task => !task.isHabit);
        const habitTasks = existingTasks.filter(task => task.isHabit);
        
        return {
          canAddToday: todayTasks.length < 3,
          canAddHabits: habitTasks.length < 3,
          todayCount: todayTasks.length,
          habitCount: habitTasks.length
        };
      },
      
      // Generate AI task suggestions when user requests them
      generateAISuggestions: async (date, goalId) => {
        const { goals } = useGoalStore.getState();
        const goal = goalId ? goals.find((g: any) => g.id === goalId) : goals[0];
        
        if (!goal) return;
        
        const taskLimits = get().canAddMoreTasks(date, goalId);
        
        // Only generate if we can add more tasks
        if (!taskLimits.canAddToday && !taskLimits.canAddHabits) {
          return;
        }
        
        set({ isGenerating: true });
        
        try {
          // Get previous tasks for context
          const previousTasks = get().tasks
            .filter(task => task.goalId === goal.id && task.completed)
            .map(task => task.title);
          
          // Call AI to generate suggestions
          const aiResponse = await generateDailyTasksForGoal(
            goal.title,
            goal.description,
            goal.deadline,
            previousTasks,
            date
          );
          
          // Parse AI response
          let aiTasks: AIGeneratedTask[] = [];
          try {
            const cleanedResponse = aiResponse
              .replace(/```json\s*/g, '')
              .replace(/```\s*$/g, '')
              .replace(/```/g, '')
              .trim();
              
            let jsonToparse = cleanedResponse;
            if (!cleanedResponse.startsWith('[')) {
              const match = cleanedResponse.match(/\[[\s\S]*\]/);
              if (match) {
                jsonToparse = match[0];
              }
            }
            
            aiTasks = JSON.parse(jsonToparse);
          } catch (error) {
            console.error('Error parsing AI suggestions:', error);
            return;
          }
          
          // Filter tasks based on what we can add
          const todayTasks = aiTasks.filter(task => !task.isHabit);
          const habitTasks = aiTasks.filter(task => task.isHabit);
          
          const tasksToAdd: AIGeneratedTask[] = [];
          
          if (taskLimits.canAddToday) {
            const todayToAdd = Math.min(3 - taskLimits.todayCount, todayTasks.length);
            tasksToAdd.push(...todayTasks.slice(0, todayToAdd));
          }
          
          if (taskLimits.canAddHabits) {
            const habitsToAdd = Math.min(3 - taskLimits.habitCount, habitTasks.length);
            tasksToAdd.push(...habitTasks.slice(0, habitsToAdd));
          }
          
          // Create task objects from AI suggestions
          const newTasks: Omit<Task, 'id'>[] = tasksToAdd.map((aiTask: AIGeneratedTask, index: number) => ({
            title: aiTask.title,
            description: aiTask.description,
            date,
            goalId: goal.id,
            completed: false,
            xpValue: aiTask.xpValue || Math.floor(Math.random() * 30) + 20,
            isHabit: aiTask.isHabit || false,
            streak: 0,
            isUserCreated: false,
            requiresValidation: true
          }));
          
          // Add suggested tasks
          for (const task of newTasks) {
            await get().addTask(task);
          }
          
        } catch (error) {
          console.error('Error generating AI suggestions:', error);
        } finally {
          set({ isGenerating: false });
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
            tasks: [],
            dailyAgendas: [],
            isGenerating: false,
            isGeneratingAgenda: false
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