import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useGoalStore } from '@/store/goalStore';
import Colors from '@/constants/colors';
import { Stack } from 'expo-router';

const ONBOARDING_KEY = '@grind/hasSeenOnboarding';

type AppState = 'loading' | 'welcome' | 'auth' | 'onboarding' | 'main';

export default function NavigationGate() {
  const [appState, setAppState] = useState<AppState>('loading');
  const { isAuthenticated, isLoading: authLoading, refreshSession } = useAuthStore();
  const { hasSeenWelcome } = useUserStore();
  const { isOnboarded } = useGoalStore();

  useEffect(() => {
    let isMounted = true;
    
    const determineInitialState = async () => {
      try {
        console.log('NavigationGate: Determining initial state...');
        
        // First, check if user has seen welcome screen
        if (!hasSeenWelcome) {
          console.log('NavigationGate: User has not seen welcome, showing welcome screen');
          if (isMounted) setAppState('welcome');
          return;
        }
        
        // Check onboarding flag from AsyncStorage
        const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
        console.log('NavigationGate: Onboarding flag:', hasSeenOnboarding);
        
        // If user hasn't seen onboarding, show auth first
        if (!hasSeenOnboarding) {
          console.log('NavigationGate: User has not completed onboarding, showing auth');
          if (isMounted) setAppState('auth');
          return;
        }
        
        // Refresh session to get current auth state
        await refreshSession();
        
        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { isAuthenticated: currentAuthState } = useAuthStore.getState();
        console.log('NavigationGate: Auth state after refresh:', currentAuthState);
        
        if (!currentAuthState) {
          console.log('NavigationGate: User not authenticated, showing auth');
          if (isMounted) setAppState('auth');
          return;
        }
        
        // Check if user has completed onboarding process
        const { isOnboarded: currentOnboardedState } = useGoalStore.getState();
        console.log('NavigationGate: Onboarded state:', currentOnboardedState);
        
        if (!currentOnboardedState) {
          console.log('NavigationGate: User authenticated but not onboarded, showing onboarding');
          if (isMounted) setAppState('onboarding');
          return;
        }
        
        console.log('NavigationGate: User fully onboarded, showing main app');
        if (isMounted) setAppState('main');
        
      } catch (error) {
        console.error('NavigationGate: Error determining initial state:', error);
        // On error, default to auth state
        if (isMounted) setAppState('auth');
      }
    };
    
    determineInitialState();
    
    return () => {
      isMounted = false;
    };
  }, [hasSeenWelcome, refreshSession]);
  
  // Listen for auth state changes
  useEffect(() => {
    if (appState === 'loading') return;
    
    console.log('NavigationGate: Auth state changed:', { isAuthenticated, authLoading, isOnboarded });
    
    // If we're in auth state and user becomes authenticated
    if (appState === 'auth' && isAuthenticated && !authLoading) {
      if (!isOnboarded) {
        console.log('NavigationGate: User authenticated, moving to onboarding');
        setAppState('onboarding');
      } else {
        console.log('NavigationGate: User authenticated and onboarded, moving to main');
        setAppState('main');
      }
    }
    
    // If user logs out, go back to auth
    if ((appState === 'main' || appState === 'onboarding') && !isAuthenticated && !authLoading) {
      console.log('NavigationGate: User logged out, moving to auth');
      setAppState('auth');
    }
  }, [isAuthenticated, authLoading, isOnboarded, appState]);
  
  // Listen for onboarding completion
  useEffect(() => {
    if (appState === 'onboarding' && isOnboarded && isAuthenticated) {
      console.log('NavigationGate: Onboarding completed, moving to main');
      setAppState('main');
    }
  }, [isOnboarded, isAuthenticated, appState]);
  
  const renderSplash = () => (
    <View style={styles.splashContainer}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.splashText}>Loading...</Text>
    </View>
  );
  
  if (appState === 'loading' || authLoading) {
    return renderSplash();
  }
  
  return (
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
      {appState === 'welcome' && (
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      )}
      
      {appState === 'auth' && (
        <>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </>
      )}
      
      {appState === 'onboarding' && (
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      )}
      
      {appState === 'main' && (
        <>
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
        </>
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  splashText: {
    color: Colors.dark.text,
    marginTop: 16,
    fontSize: 16,
  },
});