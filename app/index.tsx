import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useGoalStore } from '@/store/goalStore';

export default function IndexGate() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isOnboarded } = useGoalStore();

  useEffect(() => {
    try {
      console.log('[IndexGate] auth:', isAuthenticated, 'onboarded:', isOnboarded);
      if (!isAuthenticated) {
        router.replace('/welcome');
        return;
      }
      if (isOnboarded) {
        router.replace('/home');
      } else {
        router.replace('/onboarding');
      }
    } catch (e) {
      console.log('[IndexGate] navigation error', e);
      router.replace('/welcome');
    }
  }, [isAuthenticated, isOnboarded, router]);

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