import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useGoalStore } from '@/store/goalStore';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import DatabaseSetupPrompt from '@/components/DatabaseSetupPrompt';

export default function Index() {
  const { isOnboarded } = useGoalStore();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { fetchProfile, isLoading: profileLoading, needsDatabaseSetup, checkDatabaseSetup } = useUserStore();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Fetch user profile if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile().catch(error => {
        console.error("Error fetching profile:", error);
      });
    }
  }, [isAuthenticated]);
  
  // Set a timeout to prevent eternal loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || profileLoading) {
        console.log('Loading timeout reached, proceeding with current state');
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [authLoading, profileLoading]);
  
  // Show loading indicator while checking auth state (with timeout)
  if ((authLoading || profileLoading) && !loadingTimeout) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // First check if user is authenticated (or timeout reached)
  if (!isAuthenticated || loadingTimeout) {
    return <Redirect href="/login" />;
  }
  
  // Check if database setup is needed
  if (needsDatabaseSetup) {
    return (
      <DatabaseSetupPrompt 
        onSetupComplete={() => {
          checkDatabaseSetup();
        }}
      />
    );
  }
  
  // Then check if user has completed onboarding
  if (isOnboarded) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.dark.text,
    fontSize: 16,
  }
});