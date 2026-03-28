import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
SplashScreen.preventAutoHideAsync().catch(() => {});
import { useEffect, useMemo, useState } from "react";
import { StatusBar, Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Toast from 'react-native-toast-message';
import { TabTransitionProvider } from '@/components/TabTransitionProvider';
import '@/lib/notificationsConfig';

import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: "index",
};

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    ...FontAwesome.font,
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [allowRenderFallback, setAllowRenderFallback] = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => {
      console.log('[layout] Render fallback after 5500ms');
      setAllowRenderFallback(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 5500);
    return () => clearTimeout(t);
  }, []);
  
  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
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
              name: (user as any)?.user_metadata?.name ?? 'User',
            };
            authStore.session = data.session;
            authStore.isAuthenticated = true;
            authStore.isLoading = false;
            console.log('Session restored for user:', user.id);
          } else if (isMounted) {
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
      } catch (e) {
        console.error('App initialization error:', e);
        if (isMounted) {
          const { resetAuth } = useAuthStore.getState();
          resetAuth();
        }
      } finally {
        if (isMounted) setIsInitialized(true);
      }
    };

    // Auth state change listener
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (!isMounted) return;
          console.log('Auth state change:', event);
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            const { user } = session;
            const authStore = useAuthStore.getState();
            authStore.user = {
              id: user.id,
              email: user.email || '',
              name: (user as any)?.user_metadata?.name ?? 'User',
            };
            authStore.session = session;
            authStore.isAuthenticated = true;
            authStore.isLoading = false;
          } else if (event === 'SIGNED_OUT') {
            const { resetAuth } = useAuthStore.getState();
            resetAuth();
          }
        }
      );
      subscription = data.subscription;
    } catch (e) {
      console.error('Auth state change setup error:', e);
    }

    initializeApp();

    return () => {
      isMounted = false;
      if (subscription) {
        try { subscription.unsubscribe(); } catch (e) { console.error('Error unsubscribing from auth changes:', e); }
      }
    };
  }, []);
  
  useEffect(() => {
    if (fontsError) {
      console.warn('[layout] Font load error (continuing):', fontsError);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if ((!fontsLoaded && !allowRenderFallback) || !isInitialized) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const providerTree = useMemo(() => (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <TabTransitionProvider>
          <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'} backgroundColor={Colors.dark.background} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.dark.background },
              headerTintColor: Colors.dark.text,
              headerTitleStyle: { fontWeight: 'bold' as const },
              contentStyle: { backgroundColor: Colors.dark.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile/edit" options={{ title: "Edit Profile", headerBackTitle: "Back" }} />
            <Stack.Screen name="validate-task" options={{ title: "Validate Task", presentation: "modal", headerBackTitle: "Back" }} />
            <Stack.Screen name="journal/[id]" options={{ title: "Journal Entry", headerBackTitle: "Back" }} />
            <Stack.Screen name="ai-coach" options={{ title: "AI", presentation: "modal", headerBackTitle: "Back" }} />
            <Stack.Screen name="goals/create" options={{ title: "Create Ultimate Goal", headerBackTitle: "Back" }} />
            <Stack.Screen name="goals/edit" options={{ title: "Edit Goal", headerBackTitle: "Back" }} />
            <Stack.Screen name="challenges" options={{ title: "Challenges", headerBackTitle: "Back" }} />
            <Stack.Screen name="debug-api" options={{ title: "API Debug", headerBackTitle: "Back" }} />
          </Stack>
          <Toast />
        </TabTransitionProvider>
      </trpc.Provider>
    </QueryClientProvider>
  ), []);

  return providerTree;
}