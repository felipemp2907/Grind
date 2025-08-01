import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useGoalStore } from '@/store/goalStore';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import DatabaseSetupPrompt from '@/components/DatabaseSetupPrompt';
import Button from '@/components/Button';

export default function Index() {
  const { isOnboarded } = useGoalStore();
  const { isAuthenticated, isLoading: authLoading, user, resetAuth } = useAuthStore();
  const { fetchProfile, isLoading: profileLoading, needsDatabaseSetup, checkDatabaseSetup, hasSeenWelcome } = useUserStore();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
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
      
      // If we're still loading after timeout, reset auth state
      if (authLoading) {
        console.log('Force resetting auth state due to timeout');
        resetAuth();
      }
    }, 3000); // Reduced to 3 seconds
    
    return () => clearTimeout(timeout);
  }, [authLoading, resetAuth]);
  
  const handleRetry = () => {
    console.log('Manual retry triggered');
    setRetryCount(prev => prev + 1);
    setLoadingTimeout(false);
    setInitialCheckComplete(false);
    resetAuth();
  };
  
  // Show loading indicator while checking auth state (with timeout)
  if ((authLoading || profileLoading || !initialCheckComplete) && !loadingTimeout) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
        {retryCount > 0 && (
          <Text style={styles.retryText}>Retry attempt {retryCount}</Text>
        )}
      </View>
    );
  }
  
  // Show retry option if loading timed out
  if (loadingTimeout && (authLoading || !initialCheckComplete)) {
    return (
      <View style={styles.container}>
        <RefreshCw size={48} color={Colors.dark.inactive} />
        <Text style={styles.errorTitle}>Loading Taking Too Long</Text>
        <Text style={styles.errorText}>
          The app is taking longer than expected to load. This might be due to a network issue.
        </Text>
        <Button
          title="Retry"
          onPress={handleRetry}
          style={styles.retryButton}
          icon={<RefreshCw size={16} color="#FFFFFF" />}
        />
        <TouchableOpacity 
          onPress={() => {
            resetAuth();
            setLoadingTimeout(false);
            setInitialCheckComplete(true);
          }}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Continue to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // First check if user has seen welcome screen
  if (!hasSeenWelcome) {
    console.log('Index: User has not seen welcome, redirecting to welcome');
    return <Redirect href="/welcome" />;
  }
  
  // Then check if user is authenticated (or timeout reached)
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
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.dark.text,
    fontSize: 16,
  },
  retryText: {
    marginTop: 8,
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    marginBottom: 16,
    minWidth: 120,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});