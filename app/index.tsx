import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useGoalStore } from '@/store/goalStore';

export default function IndexGate() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isOnboarded } = useGoalStore();

  useEffect(() => {
    // Don't navigate while auth is still loading
    if (isLoading) {
      console.log('[IndexGate] Auth still loading, waiting...');
      return;
    }

    try {
      console.log('[IndexGate] auth:', isAuthenticated, 'onboarded:', isOnboarded);
      if (!isAuthenticated) {
        console.log('[IndexGate] Not authenticated, going to welcome');
        router.replace('/welcome');
        return;
      }
      if (isOnboarded) {
        console.log('[IndexGate] Authenticated and onboarded, going to home tab');
        router.replace('/(tabs)');
      } else {
        console.log('[IndexGate] Authenticated but not onboarded, going to onboarding');
        router.replace('/onboarding');
      }
    } catch (e) {
      console.log('[IndexGate] navigation error', e);
      router.replace('/welcome');
    }
  }, [isAuthenticated, isOnboarded, isLoading, router]);

  return (
    <View style={styles.container} testID="index-gate-loading">
      <ActivityIndicator size={Platform.OS === 'web' ? 24 : 'large'} color={Colors.dark.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
  },
});