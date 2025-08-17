import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useCallback } from "react";
import { Platform, StatusBar, Alert } from "react-native";
import { useGoalStore } from "@/store/goalStore";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { useTaskStore } from "@/store/taskStore";
import { useJournalStore } from "@/store/journalStore";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Toast from 'react-native-toast-message';
import { TabTransitionProvider } from '@/components/TabTransitionProvider';
import { ConnectivityBanner } from '@/components/ConnectivityBanner';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: "index",
};

// Create a client for React Query
const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  
  const { refreshSession, user } = useAuthStore();
  const { fetchProfile } = useUserStore();
  const { fetchTasks } = useTaskStore();
  const { fetchGoals } = useGoalStore();
  const { fetchEntries } = useJournalStore();
  
  // Memoize the session check function for performance
  const checkSession = useCallback(async () => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    try {
      console.log('Checking session...');
      
      // Set a more aggressive timeout to prevent hanging
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.log('Session check timeout, clearing auth state');
          // Force stop loading if session check takes too long
          const { resetAuth } = useAuthStore.getState();
          resetAuth();
        }
      }, 3000); // Reduced to 3 seconds
      
      // Try to refresh session with timeout protection
      try {
        await refreshSession();
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
        // Clear auth state on refresh failure
        const { resetAuth } = useAuthStore.getState();
        resetAuth();
        return;
      }
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!isMounted) return;
      
      // Get the latest user state after refresh
      const { user: currentUser, isAuthenticated } = useAuthStore.getState();
      
      // Only fetch user data if authenticated and user exists
      if (currentUser && isAuthenticated) {
        console.log('User authenticated, fetching data...');
        try {
          // Add timeout to data fetching as well
          const dataFetchPromise = Promise.allSettled([
            fetchProfile(),
            fetchTasks(),
            fetchGoals(),
            fetchEntries()
          ]);
          
          const dataTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Data fetch timeout')), 4000); // Reduced timeout
          });
          
          const results = await Promise.race([dataFetchPromise, dataTimeout]);
          
          // Log results if it's from Promise.allSettled
          if (Array.isArray(results)) {
            results.forEach((result, index) => {
              const names = ['profile', 'tasks', 'goals', 'entries'];
              if (result.status === 'rejected') {
                console.log(`${names[index]} fetch failed:`, result.reason);
              } else {
                console.log(`${names[index]} fetch succeeded`);
              }
            });
          }
          console.log('User data fetched successfully');
        } catch (dataError) {
          console.log("Data fetch timeout, continuing without data:", dataError);
          // Don't block the app if data fetching fails - continue with authentication
          // The individual stores will handle their own error states
        }
      } else {
        console.log('No user found after session refresh');
      }
    } catch (error) {
      console.error("Session check error:", error);
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!isMounted) return;
      
      // Always reset auth state on errors to prevent infinite loading
      console.log('Resetting auth state due to session check error');
      const { resetAuth } = useAuthStore.getState();
      resetAuth();
    }
  }, [refreshSession, fetchProfile, fetchTasks, fetchGoals, fetchEntries]);
  
  // Log important envs on app boot
  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_API_URL || 'https://expo-app-rork.vercel.app';
    const supa = process.env.EXPO_PUBLIC_SUPABASE_URL || 'unset';
    console.log(`TRPC_URL = ${base}/api/trpc`);
    console.log(`SUPABASE_URL = ${supa}`);
  }, []);

  // Check for existing session on app load
  useEffect(() => {
    let isMounted = true;
    
    // Add a safety timeout for the entire session check process
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('Safety timeout triggered, clearing auth state');
        const { resetAuth } = useAuthStore.getState();
        resetAuth();
      }
    }, 5000);
    
    checkSession().finally(() => {
      clearTimeout(safetyTimeout);
    });
    
    // Set up auth state change listener with error handling
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (!isMounted) return;
          
          console.log('Auth state change:', event, session?.user?.id);
          
          try {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              // Don't call refreshSession here as it's already handled by the auth state change
              // Just update the store directly with the session data
              if (session?.user) {
                const { user } = session;
                const authStore = useAuthStore.getState();
                authStore.user = {
                  id: user.id,
                  email: user.email || '',
                  name: user.user_metadata?.name || 'User',
                };
                authStore.session = session;
                authStore.isAuthenticated = true;
                authStore.isLoading = false;
                
                // Fetch user data after successful auth with timeout
                if (isMounted) {
                  try {
                    const dataFetchPromise = Promise.allSettled([
                      fetchProfile(),
                      fetchTasks(),
                      fetchGoals(),
                      fetchEntries()
                    ]);
                    
                    const dataTimeout = new Promise((_, reject) => {
                      setTimeout(() => reject(new Error('Data fetch timeout')), 4000);
                    });
                    
                    const results = await Promise.race([dataFetchPromise, dataTimeout]);
                    
                    // Log results if it's from Promise.allSettled
                    if (Array.isArray(results)) {
                      results.forEach((result, index) => {
                        const names = ['profile', 'tasks', 'goals', 'entries'];
                        if (result.status === 'rejected') {
                          console.log(`${names[index]} fetch failed:`, result.reason);
                        } else {
                          console.log(`${names[index]} fetch succeeded`);
                        }
                      });
                    }
                  } catch (dataError) {
                    console.log("Data fetch timeout, continuing with app:", dataError);
                    // Don't block the app if data fetching fails - continue with authentication
                    // The individual stores will handle their own error states
                  }
                }
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out, clearing state');
              // Clear auth state
              const { resetAuth } = useAuthStore.getState();
              resetAuth();
            }
          } catch (authError) {
            console.error('Error handling auth state change:', authError);
            // Don't crash the app on auth state change errors
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error("Auth state change setup error:", error);
    }
    
    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth changes:', error);
        }
      }
    };
  }, [checkSession]);
  
  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TabTransitionProvider>
          <ConnectivityBanner showWhenConnected={true} />
          <StatusBar barStyle="light-content" backgroundColor={Colors.dark.background} />
          <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.dark.background,
            },
            headerTintColor: Colors.dark.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: Colors.dark.background,
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="profile/edit" 
            options={{ 
              title: "Edit Profile",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="validate-task" 
            options={{ 
              title: "Validate Task",
              presentation: "modal",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="journal/[id]" 
            options={{ 
              title: "Journal Entry",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="ai-coach" 
            options={{ 
              title: "AI",
              presentation: "modal",
              headerBackTitle: "Back",
            }} 
          />

          <Stack.Screen 
            name="goals/create" 
            options={{ 
              title: "Create Ultimate Goal",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="goals/edit" 
            options={{ 
              title: "Edit Goal",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="challenges" 
            options={{ 
              title: "Challenges",
              headerBackTitle: "Back",
            }} 
          />
          <Stack.Screen 
            name="debug-api" 
            options={{ 
              title: "API Debug",
              headerBackTitle: "Back",
            }} 
          />
          </Stack>
          <Toast />
        </TabTransitionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}