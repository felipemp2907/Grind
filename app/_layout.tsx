import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StatusBar, Alert } from "react-native";
import { useGoalStore } from "@/store/goalStore";
import { useAuthStore } from "@/store/authStore";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

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
  
  const { refreshSession } = useAuthStore();
  
  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error("Session refresh error:", error);
        if (__DEV__) {
          Alert.alert(
            "Authentication Error",
            "There was an error refreshing your session. Please check your Supabase configuration.",
            [{ text: "OK" }]
          );
        }
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await refreshSession();
          } else if (event === 'SIGNED_OUT') {
            // Handle sign out if needed
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
              title: "DeckAI Coach",
              presentation: "modal",
            }} 
          />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}