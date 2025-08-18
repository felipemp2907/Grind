import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { useAuthStore } from "@/store/authStore";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Toast from 'react-native-toast-message';
import { TabTransitionProvider } from '@/components/TabTransitionProvider';

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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Simple initialization - just check if we have a session
  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Quick session check with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 2000);
        });
        
        const sessionPromise = supabase.auth.getSession();
        
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } | null };
          const { data } = result || { data: null };
          
          if (isMounted && data?.session) {
            const { user } = data.session;
            const authStore = useAuthStore.getState();
            authStore.user = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 'User',
            };
            authStore.session = data.session;
            authStore.isAuthenticated = true;
            authStore.isLoading = false;
            console.log('Session restored for user:', user.id);
          } else if (isMounted) {
            // No session, clear auth state
            const { resetAuth } = useAuthStore.getState();
            resetAuth();
            console.log('No session found');
          }
        } catch (sessionError) {
          console.log('Session check failed or timed out:', sessionError);
          if (isMounted) {
            const { resetAuth } = useAuthStore.getState();
            resetAuth();
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
        if (isMounted) {
          const { resetAuth } = useAuthStore.getState();
          resetAuth();
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };
    
    // Set up auth state change listener
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (!isMounted) return;
          
          console.log('Auth state change:', event);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
            }
          } else if (event === 'SIGNED_OUT') {
            const { resetAuth } = useAuthStore.getState();
            resetAuth();
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error('Auth state change setup error:', error);
    }
    
    initializeApp();
    
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

  if (!loaded || !isInitialized) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TabTransitionProvider>

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