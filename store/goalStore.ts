import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, Milestone, ProgressUpdate, MilestoneAlert, GoalShareCard } from '@/types';

interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
  isOnboarded: boolean;
  milestoneAlerts: MilestoneAlert[];
  
  // Goal management
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string) => void;
  
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
      
      addGoal: (goal) => {
        set((state) => {
          // Only allow up to 3 goals
          if (state.goals.length >= 3) {
            return state;
          }
          
          const newGoals = [...state.goals, goal];
          
          // If this is the first goal, set it as active
          const newActiveGoalId = state.activeGoalId || goal.id;
          
          return { 
            goals: newGoals,
            activeGoalId: newActiveGoalId
          };
        });
      },
      
      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === id ? { ...goal, ...updates, updatedAt: new Date().toISOString() } : goal
          )
        }));
      },
      
      deleteGoal: (id) => {
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
    }),
    {
      name: 'grind-goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);