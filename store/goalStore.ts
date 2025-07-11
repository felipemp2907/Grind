import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, Milestone } from '@/types';

interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
  isOnboarded: boolean;
  
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string) => void;
  
  addMilestone: (goalId: string, milestone: Milestone) => void;
  updateMilestone: (goalId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  completeMilestone: (goalId: string, milestoneId: string) => void;
  
  resetGoals: () => void;
  setOnboarded: (value: boolean) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      activeGoalId: null,
      isOnboarded: false,
      
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
            goal.id === id ? { ...goal, ...updates } : goal
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
            activeGoalId: newActiveGoalId
          };
        });
      },
      
      setActiveGoal: (id) => {
        set({ activeGoalId: id });
      },
      
      addMilestone: (goalId, milestone) => {
        set((state) => ({
          goals: state.goals.map(goal => 
            goal.id === goalId 
              ? { ...goal, milestones: [...goal.milestones, milestone] } 
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
                  ) 
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
                  ) 
                } 
              : goal
          )
        }));
      },
      
      resetGoals: () => set({ goals: [], activeGoalId: null }),
      
      setOnboarded: (value) => set({ isOnboarded: value }),
    }),
    {
      name: 'dailydeck-goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);