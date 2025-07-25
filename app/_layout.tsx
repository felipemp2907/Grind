import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
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
  
  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshSession();
        
        // Fetch user data if authenticated
        if (user) {
          try {
            await Promise.all([
              fetchProfile(),
              fetchTasks(),
              fetchGoals(),
              fetchEntries()
            ]);
          } catch (dataError) {
            console.error("Error fetching user data:", dataError);
            // Don't block the app if data fetching fails
          }
        }
      } catch (error) {
        console.error("Session refresh error:", error);
        // Reset auth state on critical errors to prevent infinite loading
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = error.message as string;
          if (errorMessage.includes('Invalid') || errorMessage.includes('expired') || errorMessage.includes('JWT')) {
            console.log('Clearing invalid session');
            // Clear the invalid session
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('Error signing out:', signOutError);
            }
          }
        }
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('Auth state change:', event, session?.user?.id);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await refreshSession();
            
            // Fetch user data after successful auth
            if (session?.user) {
              try {
                await Promise.all([
                  fetchProfile(),
                  fetchTasks(),
                  fetchGoals(),
                  fetchEntries()
                ]);
              } catch (dataError) {
                console.error("Error fetching user data after auth:", dataError);
                // Don't block the app if data fetching fails
              }
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out, clearing state');
            // Clear all stores when user signs out
          }
        }
      );
      
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Auth state change error:", error);
    }
  }, []);
  
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
  const { isOnboarded } = useGoalStore();
  const { isAuthenticated } = useAuthStore();
  
  // Determine initial route based on auth and onboarding status
  let initialRoute = 'login';
  
  if (isAuthenticated) {
    initialRoute = isOnboarded ? '(tabs)' : 'onboarding';
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
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
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="profile/edit" 
            options={{ 
              title: "Edit Profile",
            }} 
          />
          <Stack.Screen 
            name="validate-task" 
            options={{ 
              title: "Validate Task",
              presentation: "modal",
            }} 
          />
          <Stack.Screen 
            name="journal/[id]" 
            options={{ 
              title: "Journal Entry",
            }} 
          />
          <Stack.Screen 
            name="ai-coach" 
            options={{ 
              title: "AI",
              presentation: "modal",
            }} 
          />
          <Stack.Screen 
            name="focus-mode" 
            options={{ 
              title: "Focus Mode",
              presentation: "modal",
            }} 
          />
        </Stack>
        <Toast />
      </QueryClientProvider>
    </trpc.Provider>
  );
}