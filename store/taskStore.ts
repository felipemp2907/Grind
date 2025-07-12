import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '@/types';
import { generateDailyTasksForGoal, generateDailyAgenda } from '@/utils/aiUtils';
import { useGoalStore } from './goalStore';
import { useUserStore } from './userStore';

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
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string, journalEntryId: string) => void;
  getTasks: (date: string) => Task[];
  getTasksByGoal: (date: string, goalId: string) => Task[];
  getTaskById: (id: string) => Task | undefined;
  deleteTask: (id: string) => void;
  generateDailyTasks: (date: string) => Promise<void>;
  generateTasksForGoal: (date: string, goalId: string) => Promise<void>;
  setIsGenerating: (isGenerating: boolean) => void;
  resetStreak: (id: string) => void;
  
  // Agenda management
  generateDailyAgenda: (date: string) => Promise<void>;
  acceptAgenda: (date: string) => void;
  regenerateAgenda: (date: string) => Promise<void>;
  getAgenda: (date: string) => DailyAgenda | undefined;
  
  // Task rescheduling
  rescheduleTask: (taskId: string, newDate: string, newTime?: string) => void;
  rescheduleIncompleteTasks: (fromDate: string, toDate: string) => void;
  
  // Analytics
  getCompletionRate: (date: string) => number;
  getStreakTasks: (date: string) => Task[];
  getMissedTasks: (date: string) => Task[];
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      dailyAgendas: [],
      isGenerating: false,
      isGeneratingAgenda: false,
      
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      addTask: (task) => set((state) => ({ 
        tasks: [...state.tasks, task] 
      })),
      
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, ...updates } : task
        )
      })),
      
      completeTask: (id, journalEntryId) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id 
            ? { 
                ...task, 
                completed: true, 
                completedAt: new Date().toISOString(),
                journalEntryId,
                streak: task.isHabit ? task.streak + 1 : task.streak
              } 
            : task
        )
      })),
      
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
      
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(task => task.id !== id)
      })),
      
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
        
        const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];
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
      
      acceptAgenda: (date) => {
        const agenda = get().getAgenda(date);
        if (!agenda) return;
        
        const { goals, activeGoalId } = useGoalStore.getState();
        const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];
        if (!activeGoal) return;
        
        // Convert agenda tasks to actual tasks
        const newTasks: Task[] = agenda.tasks.map((agendaTask, index) => ({
          id: `agenda-task-${Date.now()}-${index}`,
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
        set((state) => ({
          tasks: [...state.tasks, ...newTasks],
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
          const promises = goals.map(goal => 
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
        const goal = goals.find(g => g.id === goalId);
        
        if (!goal) return;
        
        // Check if tasks already exist for this goal and date
        const existingTasks = get().tasks.filter(
          task => task.date === date && task.goalId === goalId
        );
        
        // Only generate new non-habit tasks if none exist for this date
        // For habit tasks, we'll check individually
        const existingRegularTasks = existingTasks.filter(task => !task.isHabit);
        
        if (existingRegularTasks.length > 0) {
          // If we already have regular tasks for this date, don't generate new ones
          // But we might still need to create habit tasks if they don't exist
          
          // Get existing habit tasks for this goal
          const habitTasks = get().tasks.filter(
            task => task.goalId === goalId && task.isHabit
          );
          
          // If we have habit tasks but none for this date, create copies for today
          if (habitTasks.length > 0 && !existingTasks.some(task => task.isHabit)) {
            // Create copies of habit tasks for today
            const newHabitTasks = habitTasks.map(habitTask => ({
              ...habitTask,
              id: `task-${Date.now()}-${goalId}-habit-${Math.random().toString(36).substring(7)}`,
              date,
              completed: false,
              completedAt: undefined,
              journalEntryId: undefined
            }));
            
            // Add only the habit tasks
            set((state) => ({ 
              tasks: [...state.tasks, ...newHabitTasks] 
            }));
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
          
          // Create task objects from AI response
          const newTasks: Task[] = aiTasks.map((aiTask: AIGeneratedTask, index: number) => ({
            id: `task-${Date.now()}-${goalId}-${index}-${Math.random().toString(36).substring(7)}`,
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
          set((state) => ({ 
            tasks: [...state.tasks, ...newTasks] 
          }));
          
        } catch (error) {
          console.error('Error generating tasks for goal:', error);
          
          // Create fallback tasks if AI fails
          const fallbackTasks: Task[] = [
            {
              id: `task-${Date.now()}-${goalId}-1-${Math.random().toString(36).substring(7)}`,
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
              id: `task-${Date.now()}-${goalId}-2-${Math.random().toString(36).substring(7)}`,
              title: `Research for ${goal.title} - ${new Date(date).getDay()}`,
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
              id: `task-${Date.now()}-${goalId}-3-${Math.random().toString(36).substring(7)}`,
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
          
          set((state) => ({ 
            tasks: [...state.tasks, ...fallbackTasks] 
          }));
        } finally {
          set({ isGenerating: false });
        }
      }
    }),
    {
      name: 'grind-task-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);