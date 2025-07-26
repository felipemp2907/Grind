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
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const { fetchProfile, isLoading: profileLoading, needsDatabaseSetup, checkDatabaseSetup } = useUserStore();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  
  // Fetch user profile if authenticated
  useEffect(() => {
    let isMounted = true;
    
    const initializeUser = async () => {
      if (isAuthenticated && user) {
        try {
          console.log('Index: Fetching profile for authenticated user');
          await fetchProfile();
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          if (isMounted) {
            setInitialCheckComplete(true);
          }
        }
      } else if (!authLoading) {
        // If not loading and not authenticated, mark as complete
        if (isMounted) {
          setInitialCheckComplete(true);
        }
      }
    };
    
    initializeUser();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, authLoading, fetchProfile]);
  
  // Set a timeout to prevent eternal loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Loading timeout reached, proceeding with current state');
      setLoadingTimeout(true);
      setInitialCheckComplete(true);
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Show loading indicator while checking auth state (with timeout)
  if ((authLoading || profileLoading || !initialCheckComplete) && !loadingTimeout) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // First check if user is authenticated (or timeout reached)
  if (!isAuthenticated) {
    console.log('Index: User not authenticated, redirecting to login');
    return <Redirect href="/login" />;
  }
  
  // Check if database setup is needed
  if (needsDatabaseSetup) {
    console.log('Index: Database setup needed');
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
    console.log('Index: User onboarded, redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  } else {
    console.log('Index: User not onboarded, redirecting to onboarding');
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