import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { supabase, checkDatabaseSetup, setupDatabase, serializeError } from '@/lib/supabase';
import { useAuthStore } from './authStore';

export type MotivationTone = 'data-driven' | 'tough-love';

interface CoachSettings {
  preferredTone: MotivationTone;
  agendaTime: string; // "07:00" format
  recapTime: string; // "22:00" format
  notificationsEnabled: boolean;
  missedTaskCount: number;
  missedStreakCount: number;
  lastMotivationSent: string | null;
}

interface UserState {
  profile: UserProfile;
  coachSettings: CoachSettings;
  isLoading: boolean;
  error: string | null;
  needsDatabaseSetup: boolean;
  hasSeenWelcome: boolean;
  markWelcomeSeen: () => void;
  addXp: (amount: number) => Promise<void>;
  addXP: (amount: number) => Promise<void>; // Alias for compatibility
  updateStreak: (increment: boolean) => Promise<void>;
  resetStreak: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateCoachSettings: (updates: Partial<CoachSettings>) => void;
  incrementMissedTasks: () => void;
  incrementMissedStreaks: () => void;
  resetMissedCounts: () => void;

  fetchProfile: () => Promise<void>;
  checkDatabaseSetup: () => Promise<void>;
}

// XP required for each level
const XP_LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250];

const defaultCoachSettings: CoachSettings = {
  preferredTone: 'tough-love',
  agendaTime: '07:00',
  recapTime: '22:00',
  notificationsEnabled: true,
  missedTaskCount: 0,
  missedStreakCount: 0,
  lastMotivationSent: null
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: {
        name: '',
        level: 1,
        xp: 0,
        xpToNextLevel: XP_LEVELS[1],
        streakDays: 0,
        longestStreak: 0
      },
      coachSettings: defaultCoachSettings,
      isLoading: false,
      error: null,
      needsDatabaseSetup: false,
      hasSeenWelcome: false,
      
      markWelcomeSeen: () => {
        set({ hasSeenWelcome: true });
      },
      
      fetchProfile: async () => {
        const currentState = get();
        
        // Prevent multiple simultaneous fetch attempts
        if (currentState.isLoading) {
          console.log('Profile fetch already in progress, skipping');
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const { user } = useAuthStore.getState();
          
          if (!user?.id) {
            console.log("User not authenticated, skipping profile fetch");
            set({ isLoading: false, error: null });
            return;
          }
          
          console.log('Fetching profile for user:', user.id);
          
          // Quick database check without timeout to avoid hanging
          try {
            const dbResult = await checkDatabaseSetup();
            if (!dbResult.isSetup) {
              console.log('Database not ready, skipping profile fetch:', dbResult.error);
              set({ 
                needsDatabaseSetup: true, 
                isLoading: false,
                error: null
              });
              return;
            }
          } catch (dbError) {
            console.log('Database check failed, continuing without profile:', serializeError(dbError));
            set({ 
              isLoading: false,
              error: null,
              needsDatabaseSetup: false
            });
            return;
          }
          
          // Fetch profile with a very short timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .abortSignal(controller.signal)
              .single();
              
            clearTimeout(timeoutId);
            
            if (error) {
              console.log('Error fetching profile, continuing without data:', serializeError(error));
              set({ 
                isLoading: false,
                error: null,
                needsDatabaseSetup: false
              });
              return;
            }
            
            if (data) {
              console.log('Profile fetched successfully');
              const xpToNextLevel = data.level < XP_LEVELS.length - 1 
                ? XP_LEVELS[data.level] - data.xp 
                : 999999;
                
              set({
                profile: {
                  name: data.name || '',
                  level: data.level || 1,
                  xp: data.xp || 0,
                  xpToNextLevel,
                  streakDays: data.streak_days || 0,
                  longestStreak: data.longest_streak || 0,
                  avatarUrl: data.avatar_url || undefined
                },
                isLoading: false,
                needsDatabaseSetup: false
              });
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.log('Profile fetch timed out, continuing without profile data');
            } else {
              console.log('Profile fetch failed:', serializeError(fetchError));
            }
            set({ 
              error: null,
              isLoading: false,
              needsDatabaseSetup: false
            });
          }
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.log('Profile fetch error, continuing without profile data:', errorMessage);
          set({ 
            error: null,
            isLoading: false,
            needsDatabaseSetup: false
          });
        }
      },
      
      addXp: async (amount: number) => {
        const { profile } = get();
        const { user } = useAuthStore.getState();
        
        if (!user?.id) return;
        
        let newXP = profile.xp + amount;
        let newLevel = profile.level;
        
        // Check if user leveled up
        while (newLevel < XP_LEVELS.length - 1 && newXP >= XP_LEVELS[newLevel]) {
          newLevel++;
        }
        
        const xpToNextLevel = newLevel < XP_LEVELS.length - 1 
          ? XP_LEVELS[newLevel] - newXP 
          : 999999; // Max level
        
        // Update local state
        set({
          profile: {
            ...profile,
            xp: newXP,
            level: newLevel,
            xpToNextLevel
          }
        });
        
        try {
          // Check database setup
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error("Database not set up:", dbResult.error);
            return;
          }
          
          // Update in Supabase using upsert
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              name: profile.name || 'User',
              xp: newXP,
              level: newLevel,
              streak_days: profile.streakDays,
              longest_streak: profile.longestStreak
            }, {
              onConflict: 'id'
            });
            
          if (error) {
            console.error("Error updating XP:", serializeError(error));
          }
        } catch (error) {
          console.error("Error updating XP:", serializeError(error));
        }
      },
      
      updateStreak: async (increment) => {
        const { profile } = get();
        const { user } = useAuthStore.getState();
        
        if (!user?.id) return;
        
        const newStreakDays = increment ? profile.streakDays + 1 : profile.streakDays;
        const newLongestStreak = Math.max(profile.longestStreak, newStreakDays);
        
        // Update local state
        set({
          profile: {
            ...profile,
            streakDays: newStreakDays,
            longestStreak: newLongestStreak
          }
        });
        
        try {
          // Check database setup
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error("Database not set up:", dbResult.error);
            return;
          }
          
          // Update in Supabase using upsert
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              name: profile.name || 'User',
              level: profile.level,
              xp: profile.xp,
              streak_days: newStreakDays,
              longest_streak: newLongestStreak
            }, {
              onConflict: 'id'
            });
            
          if (error) {
            console.error("Error updating streak:", serializeError(error));
          }
        } catch (error) {
          console.error("Error updating streak:", serializeError(error));
        }
      },
      
      resetStreak: async () => {
        const { profile } = get();
        const { user } = useAuthStore.getState();
        
        if (!user?.id) return;
        
        // Update local state
        set({
          profile: {
            ...profile,
            streakDays: 0
          }
        });
        
        try {
          // Check database setup
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error("Database not set up:", dbResult.error);
            return;
          }
          
          // Update in Supabase using upsert
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              name: profile.name || 'User',
              level: profile.level,
              xp: profile.xp,
              streak_days: 0,
              longest_streak: profile.longestStreak
            }, {
              onConflict: 'id'
            });
            
          if (error) {
            console.error("Error resetting streak:", serializeError(error));
          }
        } catch (error) {
          console.error("Error resetting streak:", serializeError(error));
        }
      },
      
      updateProfile: async (updates) => {
        const { profile } = get();
        const { user } = useAuthStore.getState();
        
        if (!user?.id) {
          console.error('No authenticated user found');
          throw new Error('User not authenticated');
        }
        
        // Update local state first
        set({
          profile: {
            ...profile,
            ...updates
          }
        });
        
        try {
          // Check database setup
          const dbResult = await setupDatabase();
          if (!dbResult.success) {
            console.error("Database not set up:", dbResult.error);
            throw new Error(`Database not set up: ${dbResult.error}`);
          }
          
          // First, ensure the user profile exists using the RPC function
          const { data: ensureResult, error: ensureError } = await supabase.rpc('ensure_user_profile', {
            user_id: user.id,
            user_name: updates.name || profile.name || user.email?.split('@')[0] || 'User'
          });
          
          if (ensureError) {
            console.error('Error ensuring profile exists:', serializeError(ensureError));
            // Continue with upsert as fallback
          } else if (!ensureResult) {
            console.error('User does not exist in auth.users table');
            throw new Error('User authentication error. Please sign out and sign in again.');
          }
          
          // Now update the profile with all the data
          const profileData = {
            id: user.id,
            name: updates.name !== undefined ? updates.name : profile.name || 'User',
            level: updates.level !== undefined ? updates.level : profile.level,
            xp: updates.xp !== undefined ? updates.xp : profile.xp,
            streak_days: updates.streakDays !== undefined ? updates.streakDays : profile.streakDays,
            longest_streak: updates.longestStreak !== undefined ? updates.longestStreak : profile.longestStreak,
            avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : profile.avatarUrl
          };
          
          console.log('Updating profile with data:', profileData);
          
          const { error } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'id'
            });
            
          if (error) {
            console.error("Error saving profile:", serializeError(error));
            throw new Error(`Failed to save profile: ${serializeError(error)}`);
          }
          
          console.log('Profile updated successfully');
        } catch (error) {
          const errorMessage = serializeError(error);
          console.error("Error updating profile:", errorMessage);
          throw new Error(errorMessage);
        }
      },
      
      updateCoachSettings: (updates) => {
        set((state) => ({
          coachSettings: {
            ...state.coachSettings,
            ...updates
          }
        }));
      },
      
      incrementMissedTasks: () => {
        set((state) => ({
          coachSettings: {
            ...state.coachSettings,
            missedTaskCount: state.coachSettings.missedTaskCount + 1
          }
        }));
      },
      
      incrementMissedStreaks: () => {
        set((state) => ({
          coachSettings: {
            ...state.coachSettings,
            missedStreakCount: state.coachSettings.missedStreakCount + 1
          }
        }));
      },
      
      resetMissedCounts: () => {
        set((state) => ({
          coachSettings: {
            ...state.coachSettings,
            missedTaskCount: 0,
            missedStreakCount: 0,
            lastMotivationSent: null
          }
        }));
      },
      

      
      checkDatabaseSetup: async () => {
        try {
          const result = await checkDatabaseSetup();
          set({ needsDatabaseSetup: !result.isSetup });
          if (result.isSetup) {
            // If database is now set up, try to fetch profile
            get().fetchProfile();
          }
        } catch (error) {
          console.error('Error checking database setup:', error);
        }
      },
      
      // Alias for compatibility
      addXP: async (amount: number) => {
        return get().addXp(amount);
      }
    }),
    {
      name: 'grind-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);