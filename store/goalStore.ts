import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, Milestone, ProgressUpdate, MilestoneAlert, GoalShareCard } from '@/types';
import { supabase, setupDatabase, serializeError, getCurrentUser, ensureUserProfile } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
  isOnboarded: boolean;
  milestoneAlerts: MilestoneAlert[];
  
  // Goal management
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setActiveGoal: (id: string) => void;
  fetchGoals: () => Promise<void>;
  
  // Progress tracking
  updateProgress: (update: ProgressUpdate) => void;
  addXpToGoal: (goalId: string, xp: number) => void;
  updateStreakCount: (goalId: string, count: number) => void;
  
  // Milestone management
  addMilestone: (goalId: string, milestone: Milestone) => void;
  updateMilestone: (goalId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  completeMilestone: (goalId: string, milestoneId: string) => void;
  checkMilestones: (goalId: string) => MilestoneAlert[];
  dismissMilestoneAlert: (alertId: string) => void;
  
  // Task relationship management
  addTaskToGoal: (goalId: string, taskId: string, isHabit: boolean) => void;
  removeTaskFromGoal: (goalId: string, taskId: string, isHabit: boolean) => void;
  
  // Goal status management
  completeGoal: (goalId: string) => void;
  abandonGoal: (goalId: string) => void;
  reactivateGoal: (goalId: string) => void;
  
  // Analytics and sharing
  getGoalProgress: (goalId: string) => number;
  getGoalShareCard: (goalId: string) => GoalShareCard | null;
  getDaysRemaining: (goalId: string) => number;
  
  // Utility functions
  resetGoals: () => void;
  setOnboarded: (value: boolean) => void;
  getActiveGoal: () => Goal | null;
  getGoalById: (id: string) => Goal | null;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      activeGoalId: null,
      isOnboarded: false,
      milestoneAlerts: [],
      
      addGoal: async (goal) => {
        // Save to Supabase first to get the generated UUID
        try {
          // Get current user directly from Supabase to ensure it's valid
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) {
            console.error('User not authenticated:', userError);
            return;
          }
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          console.log('Adding goal for user:', currentUser.id);
          
          // Ensure user profile exists
          const profileResult = await ensureUserProfile(currentUser.id, {
            name: currentUser.user_metadata?.name,
            email: currentUser.email
          });
          
          if (!profileResult.success) {
            console.error('Error ensuring profile exists:', profileResult.error);
            throw new Error(`Failed to create user profile: ${profileResult.error}`);
          }
          
          const { data, error } = await supabase
            .from('goals')
            .insert({
              user_id: currentUser.id,
              title: goal.title,
              description: goal.description,
              deadline: goal.deadline ? new Date(goal.deadline).toISOString() : null
            })
            .select()
            .single();
            
          if (error) {
            console.error('Error saving goal to Supabase:', serializeError(error));
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return;
          }
          
          if (data) {
            // Update the goal with the database-generated ID
            const goalWithDbId = {
              ...goal,
              id: data.id,
              createdAt: data.created_at,
              updatedAt: data.updated_at
            };
            
            // Add to local state with the correct ID
            set((state) => {
              // Only allow up to 3 goals
              if (state.goals.length >= 3) {
                return state;
              }
              
              const newGoals = [...state.goals, goalWithDbId];
              
              // If this is the first goal, set it as active
              const newActiveGoalId = state.activeGoalId || goalWithDbId.id;
              
              return { 
                goals: newGoals,
                activeGoalId: newActiveGoalId
              };
            });
          }
        } catch (error) {
          console.error('Error saving goal:', serializeError(error));
        }
      },
      
      updateGoal: async (id, updates) => {
        // Update local state first
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === id ? { ...goal, ...updates, updatedAt: new Date().toISOString() } : goal
          )
        }));
        
        // Update in Supabase
        try {
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const supabaseUpdates: any = {};
          if (updates.title !== undefined) supabaseUpdates.title = updates.title;
          if (updates.description !== undefined) supabaseUpdates.description = updates.description;
          if (updates.deadline !== undefined) supabaseUpdates.deadline = updates.deadline ? new Date(updates.deadline).toISOString() : null;
          
          const { error } = await supabase
            .from('goals')
            .update(supabaseUpdates)
            .eq('id', id)
            .eq('user_id', currentUser.id);
            
          if (error) {
            console.error('Error updating goal in Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error updating goal:', serializeError(error));
        }
      },
      
      deleteGoal: async (id) => {
        // Remove from local state
        set((state) => {
          const newGoals = state.goals.filter(goal => goal.id !== id);
          
          // If the active goal was deleted, set a new active goal
          let newActiveGoalId = state.activeGoalId;
          if (state.activeGoalId === id) {
            newActiveGoalId = newGoals.length > 0 ? newGoals[0].id : null;
          }
          
          return {
            goals: newGoals,
            activeGoalId: newActiveGoalId,
            // Remove milestone alerts for deleted goal
            milestoneAlerts: state.milestoneAlerts.filter(alert => alert.goalId !== id)
          };
        });
        
        // Delete from Supabase
        try {
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
            
          if (error) {
            console.error('Error deleting goal from Supabase:', serializeError(error));
          }
        } catch (error) {
          console.error('Error deleting goal:', serializeError(error));
        }
      },
      
      setActiveGoal: (id) => {
        set({ activeGoalId: id });
      },
      
      updateProgress: (update) => {
        set((state) => {
          const updatedGoals = state.goals.map(goal => {
            if (goal.id === update.goalId) {
              const updatedGoal = {
                ...goal,
                progressValue: update.newProgressValue,
                xpEarned: goal.xpEarned + update.xpEarned,
                updatedAt: new Date().toISOString()
              };
              
              // Check for milestone completion
              if (update.milestoneReached && update.milestoneTitle) {
                const alerts = get().checkMilestones(goal.id);
                set((prevState) => ({
                  milestoneAlerts: [...prevState.milestoneAlerts, ...alerts]
                }));
              }
              
              return updatedGoal;
            }
            return goal;
          });
          
          return { goals: updatedGoals };
        });
      },
      
      addXpToGoal: (goalId, xp) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, xpEarned: goal.xpEarned + xp, updatedAt: new Date().toISOString() }
              : goal
          )
        }));
      },
      
      updateStreakCount: (goalId, count) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, streakCount: count, updatedAt: new Date().toISOString() }
              : goal
          )
        }));
      },
      
      addMilestone: (goalId, milestone) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, milestones: [...goal.milestones, milestone], updatedAt: new Date().toISOString() } 
              : goal
          )
        }));
      },
      
      updateMilestone: (goalId, milestoneId, updates) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { 
                  ...goal, 
                  milestones: goal.milestones.map(milestone => 
                    milestone.id === milestoneId 
                      ? { ...milestone, ...updates } 
                      : milestone
                  ),
                  updatedAt: new Date().toISOString()
                } 
              : goal
          )
        }));
      },
      
      completeMilestone: (goalId, milestoneId) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { 
                  ...goal, 
                  milestones: goal.milestones.map(milestone => 
                    milestone.id === milestoneId 
                      ? { ...milestone, completed: true, completedAt: new Date().toISOString() } 
                      : milestone
                  ),
                  updatedAt: new Date().toISOString()
                } 
              : goal
          )
        }));
      },
      
      checkMilestones: (goalId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal) return [];
        
        const progressPercentage = goal.targetValue > 0 
          ? (goal.progressValue / goal.targetValue) * 100 
          : 0;
        
        const alerts: MilestoneAlert[] = [];
        const milestoneThresholds = [25, 50, 75, 100];
        
        milestoneThresholds.forEach(threshold => {
          if (progressPercentage >= threshold) {
            const existingAlert = get().milestoneAlerts.find(
              alert => alert.goalId === goalId && alert.progressPercentage === threshold
            );
            
            if (!existingAlert) {
              const celebrationLevel = threshold === 100 ? 'large' : threshold >= 75 ? 'medium' : 'small';
              const message = threshold === 100 
                ? `🎉 Congratulations! You've completed your goal: ${goal.title}!`
                : `🎯 Milestone reached! You're ${threshold}% of the way to: ${goal.title}`;
              
              alerts.push({
                id: `milestone-${goalId}-${threshold}-${Date.now()}`,
                goalId,
                milestoneTitle: `${threshold}% Complete`,
                progressPercentage: threshold,
                message,
                celebrationLevel,
                createdAt: new Date().toISOString(),
                dismissed: false
              });
            }
          }
        });
        
        return alerts;
      },
      
      dismissMilestoneAlert: (alertId) => {
        set((state) => ({
          milestoneAlerts: state.milestoneAlerts.map(alert =>
            alert.id === alertId ? { ...alert, dismissed: true } : alert
          )
        }));
      },
      
      addTaskToGoal: (goalId, taskId, isHabit) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { 
                  ...goal, 
                  [isHabit ? 'streakTaskIds' : 'todayTasksIds']: [
                    ...goal[isHabit ? 'streakTaskIds' : 'todayTasksIds'],
                    taskId
                  ],
                  updatedAt: new Date().toISOString()
                } 
              : goal
          )
        }));
      },
      
      removeTaskFromGoal: (goalId, taskId, isHabit) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { 
                  ...goal, 
                  [isHabit ? 'streakTaskIds' : 'todayTasksIds']: 
                    goal[isHabit ? 'streakTaskIds' : 'todayTasksIds'].filter(id => id !== taskId),
                  updatedAt: new Date().toISOString()
                } 
              : goal
          )
        }));
      },
      
      completeGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, status: 'completed' as const, updatedAt: new Date().toISOString() }
              : goal
          )
        }));
      },
      
      abandonGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, status: 'abandoned' as const, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : goal
          )
        }));
      },
      
      reactivateGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, status: 'active' as const, archivedAt: undefined, updatedAt: new Date().toISOString() }
              : goal
          )
        }));
      },
      
      getGoalProgress: (goalId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal || goal.targetValue === 0) return 0;
        return Math.min((goal.progressValue / goal.targetValue) * 100, 100);
      },
      
      getGoalShareCard: (goalId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal) return null;
        
        const progressPercentage = get().getGoalProgress(goalId);
        const daysRemaining = get().getDaysRemaining(goalId);
        
        const motivationalQuotes = [
          "Every step forward is progress! 🚀",
          "Consistency beats perfection! 💪",
          "You're closer than you think! 🎯",
          "Small steps, big dreams! ✨",
          "Progress, not perfection! 🌟"
        ];
        
        return {
          goalTitle: goal.title,
          progressPercentage,
          daysRemaining,
          streakCount: goal.streakCount,
          xpEarned: goal.xpEarned,
          motivationalQuote: motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
          imageUrl: goal.coverImage || ''
        };
      },
      
      getDaysRemaining: (goalId) => {
        const goal = get().goals.find(g => g.id === goalId);
        if (!goal) return 0;
        
        const deadline = new Date(goal.deadline);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(diffDays, 0);
      },
      
      getActiveGoal: () => {
        const { goals, activeGoalId } = get();
        return goals.find(goal => goal.id === activeGoalId) || null;
      },
      
      getGoalById: (id) => {
        return get().goals.find(goal => goal.id === id) || null;
      },
      
      resetGoals: () => set({ goals: [], activeGoalId: null, milestoneAlerts: [] }),
      
      setOnboarded: (value) => set({ isOnboarded: value }),
      
      fetchGoals: async () => {
        try {
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) return;
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            return;
          }
          
          const { data, error } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching goals:', serializeError(error));
            return;
          }
          
          if (data) {
            const goals: Goal[] = data.map(goal => ({
              id: goal.id,
              title: goal.title,
              description: goal.description || '',
              deadline: goal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to 30 days from now
              createdAt: goal.created_at,
              updatedAt: goal.updated_at,
              progressValue: 0,
              targetValue: 100,
              xpEarned: 0,
              streakCount: 0,
              todayTasksIds: [],
              streakTaskIds: [],
              status: 'active' as const,
              milestones: []
            }));
            
            set({ 
              goals,
              activeGoalId: goals.length > 0 && !get().activeGoalId ? goals[0].id : get().activeGoalId
            });
          }
        } catch (error) {
          console.error('Error fetching goals:', serializeError(error));
        }
      }
    }),
    {
      name: 'grind-goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);