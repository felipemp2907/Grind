import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useGoalStore } from '@/store/goalStore';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export default function Index() {
  const { isOnboarded } = useGoalStore();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { fetchProfile, isLoading: profileLoading } = useUserStore();
  
  // Fetch user profile if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile().catch(error => {
        console.error("Error fetching profile:", error);
      });
    }
  }, [isAuthenticated]);
  
  // Show loading indicator while checking auth state
  if (authLoading || profileLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
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