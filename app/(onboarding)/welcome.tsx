import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { markWelcomeSeen } from '@/lib/onboardingGate';
import WelcomeScreen from '@/components/WelcomeScreen';

export default function WelcomeModal() {
  const router = useRouter();
  const user = useAuthStore.getState().session?.user;

  const onContinue = async () => {
    if (user?.id) await markWelcomeSeen(user.id);
    router.replace('/'); // go Home
  };

  return (
    <View style={styles.fill}>
      <WelcomeScreen onContinue={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({ 
  fill: { flex:1, backgroundColor:'black' }
});