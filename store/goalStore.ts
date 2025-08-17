import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Goal, Milestone, ProgressUpdate, MilestoneAlert, GoalShareCard } from '@/types';
import { supabase, setupDatabase, serializeError, getCurrentUser, ensureUserProfile } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { trpcClient, checkApiConnectivity } from '@/lib/trpc';
import { createClientPlan, convertPlanToTasks } from '@/lib/clientPlanner';

interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
  isOnboarded: boolean;
  milestoneAlerts: MilestoneAlert[];
  
  // Goal management
  addGoal: (goal: Goal) => Promise<void>;
  createUltimateGoal: (goalData: {
    title: string;
    description: string;
    deadline: string;
    category?: string;
    targetValue?: number;
    unit?: string;
    priority?: 'high' | 'medium' | 'low';
    color?: string;
    coverImage?: string;
  }) => Promise<void>;
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
  resetEverything: () => Promise<void>; // Developer only
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
        // Add to local state first for immediate UI feedback
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
        
        // Save to Supabase in the background
        try {
          // Get current user directly from Supabase to ensure it's valid
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) {
            console.error('User not authenticated:', userError);
            // Don't throw error here, just log it
            return;
          }
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            // Don't throw error here, just log it
            return;
          }
          
          console.log('Adding goal for user:', currentUser.id);
          
          // Ensure user profile exists with retry logic
          let profileResult = await ensureUserProfile(currentUser.id, {
            name: currentUser.user_metadata?.name,
            email: currentUser.email
          });
          
          // If profile creation failed, try once more after a short delay
          if (!profileResult.success) {
            console.log('Profile creation failed, retrying in 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            profileResult = await ensureUserProfile(currentUser.id, {
              name: currentUser.user_metadata?.name,
              email: currentUser.email
            });
          }
          
          if (!profileResult.success) {
            console.error('Error ensuring profile exists:', profileResult.error);
            // Don't throw error here, just log it
            return;
          }
          
          // Verify profile exists before inserting goal
          const { data: profileCheck, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', currentUser.id)
            .single();
            
          if (profileCheckError || !profileCheck) {
            console.error('Profile verification failed:', profileCheckError);
            // Don't throw error here, just log it
            return;
          }
          
          console.log('Profile verified, inserting goal...');
          
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
            
            // Don't throw error here, just log it - the goal is already in local state
            return;
          }
          
          if (data) {
            console.log('Goal saved successfully:', data);
            
            // Update the goal in local state with the database-generated ID
            set((state) => ({
              goals: state.goals.map(g => 
                g.id === goal.id 
                  ? {
                      ...g,
                      id: data.id,
                      createdAt: data.created_at,
                      updatedAt: data.updated_at
                    }
                  : g
              ),
              activeGoalId: state.activeGoalId === goal.id ? data.id : state.activeGoalId
            }));
          }
        } catch (error) {
          console.error('Error saving goal:', serializeError(error));
          // Don't throw error - goal is already in local state
        }
      },
      
      createUltimateGoal: async (goalData) => {
        try {
          console.log('Creating ultimate goal:', goalData.title);
          
          // Check API connectivity first
          const apiCheck = await Promise.race([
            checkApiConnectivity(),
            new Promise<{ connected: false; error: string }>((_, reject) => 
              setTimeout(() => reject({ connected: false, error: 'Timeout' }), 800)
            )
          ]).catch(() => ({ connected: false, error: 'Connection check failed' }));
          
          let result;
          let usedClientPlanner = false;
          
          if (apiCheck.connected && 'procedures' in apiCheck && apiCheck.procedures?.includes('goals.createUltimate')) {
            // Try to use the backend tRPC procedure
            try {
              console.log('🌐 Using server planner via tRPC');
              result = await trpcClient.goals.createUltimate.mutate({
                ...goalData,
                deadlineISO: goalData.deadline
              });
              console.log('✅ Server goal creation result:', result);
            } catch (trpcError) {
              console.log('❌ tRPC failed, falling back to client planner:', trpcError);
              usedClientPlanner = true;
            }
          } else {
            console.log('🔌 API unreachable, using client planner');
            usedClientPlanner = true;
          }
          
          if (usedClientPlanner) {
            // Use client-side planner
            let { user: currentUser } = await getCurrentUser();
            if (!currentUser) {
              try {
                const { refreshSession } = useAuthStore.getState();
                console.log('No user found, attempting to refresh session...');
                await refreshSession();
                const recheck = await getCurrentUser();
                currentUser = recheck.user as any;
              } catch (refreshErr) {
                console.log('Session refresh failed:', serializeError(refreshErr));
              }
            }
            
            if (!currentUser) {
              console.error('User not authenticated. Cannot create goal.');
              throw new Error('Authentication required');
            }
            
            const dbResult = await setupDatabase();
            if (!dbResult.success) {
              console.error('Database not set up:', dbResult.error);
              throw new Error('Database setup failed');
            }
            
            // Create goal in Supabase
            const goalInsertData: any = {
              user_id: currentUser.id,
              title: goalData.title,
              description: goalData.description,
              deadline: new Date(goalData.deadline).toISOString(),
              status: 'active'
            };
            
            // Add optional columns
            if (goalData.category) goalInsertData.category = goalData.category;
            if (goalData.targetValue !== undefined) goalInsertData.target_value = goalData.targetValue;
            if (goalData.unit) goalInsertData.unit = goalData.unit;
            if (goalData.priority) goalInsertData.priority = goalData.priority;
            if (goalData.color) goalInsertData.color = goalData.color;
            if (goalData.coverImage) goalInsertData.cover_image = goalData.coverImage;
            
            const { data: goalDbData, error: goalError } = await supabase
              .from('goals')
              .insert(goalInsertData)
              .select()
              .single();
              
            if (goalError || !goalDbData) {
              console.error('Failed to create goal:', serializeError(goalError));
              throw new Error('Goal creation failed');
            }
            
            console.log('🤖 Creating client-side plan...');
            
            // Generate client-side plan
            const clientPlan = createClientPlan({
              title: goalData.title,
              description: goalData.description,
              deadline: goalData.deadline
            });
            
            // Convert plan to tasks
            const tasksToInsert = convertPlanToTasks(clientPlan, goalDbData.id);
            
            console.log(`📝 Inserting ${tasksToInsert.length} tasks...`);
            
            // Insert tasks in batches of 1000
            const batchSize = 1000;
            let totalInserted = 0;
            
            try {
              for (let i = 0; i < tasksToInsert.length; i += batchSize) {
                const batch = tasksToInsert.slice(i, i + batchSize);
                
                // Convert to Supabase format
                const supabaseTasks = batch.map(task => ({
                  user_id: currentUser.id,
                  goal_id: task.goalId,
                  title: task.title,
                  description: task.description,
                  type: task.type,
                  task_date: task.type === 'streak' ? task.taskDate : null,
                  due_at: task.type === 'today' ? new Date(`${task.date}T09:00:00.000Z`).toISOString() : null,
                  load_score: Math.floor(task.xpValue / 10), // Convert XP back to load
                  proof_mode: task.proofRequired ? 'realtime' : 'flex',
                  completed: false
                }));
                
                const { error: insertError } = await supabase
                  .from('tasks')
                  .insert(supabaseTasks);
                  
                if (insertError) {
                  console.error('Task insertion failed:', serializeError(insertError));
                  // Clean up goal if task insertion fails
                  await supabase.from('goals').delete().eq('id', goalDbData.id);
                  throw new Error('Task creation failed');
                }
                
                totalInserted += batch.length;
              }
            } catch (insertError) {
              console.error('Failed to insert tasks:', insertError);
              throw insertError;
            }
            
            // Calculate stats
            // Calculate stats
            const deadline = new Date(goalData.deadline);
            const totalDays = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const streakCount = clientPlan.streak_habits.length;
            const totalTodayTasks = clientPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0);
            
            console.log(`✅ BATCH PLAN SEEDED { goalId: ${goalDbData.id}, days: ${totalDays}, streak_count: ${streakCount}, total_today: ${totalTodayTasks} }`);
            
            // Create result object
            result = {
              goal: {
                id: goalDbData.id,
                title: goalData.title,
                description: goalData.description,
                deadline: goalData.deadline,
                category: goalData.category || '',
                createdAt: goalDbData.created_at,
                updatedAt: goalDbData.updated_at,
                progressValue: 0,
                targetValue: goalData.targetValue || 100,
                unit: goalData.unit || '',
                xpEarned: 0,
                streakCount: 0,
                todayTasksIds: [],
                streakTaskIds: [],
                status: 'active' as const,
                coverImage: goalData.coverImage,
                color: goalData.color,
                priority: goalData.priority || 'medium',
                milestones: []
              },
              streakTasksCreated: totalInserted,
              totalDays,
              daysToDeadline: totalDays
            };
          }
          
          if (!result?.goal) {
            console.log('No result from goal creation. Aborting local state update.');
            return;
          }
          // Add the goal to local state
          const newGoal: Goal = {
            id: result.goal.id,
            title: result.goal.title,
            description: result.goal.description,
            deadline: result.goal.deadline,
            category: result.goal.category || '',
            createdAt: result.goal.createdAt,
            updatedAt: result.goal.updatedAt,
            progressValue: result.goal.progressValue,
            targetValue: result.goal.targetValue,
            unit: result.goal.unit || '',
            xpEarned: result.goal.xpEarned,
            streakCount: result.goal.streakCount,
            todayTasksIds: result.goal.todayTasksIds,
            streakTaskIds: result.goal.streakTaskIds,
            status: result.goal.status,
            coverImage: result.goal.coverImage,
            color: result.goal.color,
            priority: result.goal.priority,
            milestones: result.goal.milestones
          };
          
          set((state) => {
            // Only allow up to 3 goals
            if (state.goals.length >= 3) {
              return state;
            }
            
            const newGoals = [...state.goals, newGoal];
            
            // If this is the first goal, set it as active
            const newActiveGoalId = state.activeGoalId || newGoal.id;
            
            return { 
              goals: newGoals,
              activeGoalId: newActiveGoalId
            };
          });
          
          const tasksCreated = 'streakTasksCreated' in result ? result.streakTasksCreated : 0;
          const totalDays = 'totalDays' in result ? result.totalDays : 0;
          console.log(`Ultimate goal created successfully with ${tasksCreated} tasks for ${totalDays} days`);
          
          // Trigger heavy haptic feedback on successful goal creation
          if (Platform.OS !== 'web') {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              console.log('Heavy haptic feedback triggered for goal creation');
            } catch (hapticError) {
              console.log('Haptic feedback failed:', hapticError);
            }
          }
          
        } catch (error) {
          console.error('Error creating ultimate goal:', error);
          return;
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
        // Set a shorter timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Goals fetch timeout')), 5000);
        });
        
        try {
          const userPromise = getCurrentUser();
          const { user: currentUser, error: userError } = await Promise.race([userPromise, timeoutPromise]) as any;
          if (userError || !currentUser) {
            console.log('User not authenticated, skipping goals fetch');
            return;
          }
          
          const dbCheckPromise = setupDatabase();
          const dbResult = await Promise.race([dbCheckPromise, timeoutPromise]) as any;
          if (!dbResult.success) {
            console.log('Database not ready, skipping goals fetch:', dbResult.error);
            return;
          }
          
          const goalsPromise = supabase
            .from('goals')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10); // Limit results to improve performance
            
          const { data, error } = await Promise.race([goalsPromise, timeoutPromise]) as any;
            
          if (error) {
            console.log('Error fetching goals, continuing without data:', serializeError(error));
            return;
          }
          
          if (data) {
            const goals: Goal[] = data.map((goal: any) => ({
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
            console.log(`Successfully fetched ${goals.length} goals`);
          }
        } catch (error) {
          const errorMessage = serializeError(error);
          console.log('Goals fetch failed, continuing without data:', errorMessage);
          
          // Always continue without blocking the app
          return;
        }
      },

      resetEverything: async () => {
        try {
          const { user: currentUser, error: userError } = await getCurrentUser();
          if (userError || !currentUser) {
            // Reset local state even if user not authenticated
            set({ 
              goals: [], 
              activeGoalId: null, 
              milestoneAlerts: [], 
              isOnboarded: false 
            });
            return;
          }
          
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error('Database not set up:', dbResult.error);
            // Reset local state even if database not set up
            set({ 
              goals: [], 
              activeGoalId: null, 
              milestoneAlerts: [], 
              isOnboarded: false 
            });
            return;
          }
          
          // Delete all goals for the current user
          const { error: deleteError } = await supabase
            .from('goals')
            .delete()
            .eq('user_id', currentUser.id);
            
          if (deleteError) {
            console.error('Error deleting goals from Supabase:', serializeError(deleteError));
          }
          
          // Reset local state
          set({ 
            goals: [], 
            activeGoalId: null, 
            milestoneAlerts: [], 
            isOnboarded: false 
          });
        } catch (error) {
          console.error('Error resetting everything:', serializeError(error));
          // Reset local state even if there's an error
          set({ 
            goals: [], 
            activeGoalId: null, 
            milestoneAlerts: [], 
            isOnboarded: false 
          });
        }
      }
    }),
    {
      name: 'grind-goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);