import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/store/userStore';
import TargetBackdrop from './TargetBackdrop';

export default function WelcomeScreen() {
  const { markWelcomeSeen } = useUserStore();
  
  const handleStart = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Mark welcome as seen
    markWelcomeSeen();
    
    // Don't set onboarding flag yet - that happens after successful auth + goal creation
    // Just navigate to auth
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TargetBackdrop />
      <View style={styles.content}>
        {/* Welcome text */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleLine1}>Welcome to the</Text>
          <Text style={styles.titleLine2}>Grind</Text>
        </View>
        
        {/* Get started button */}
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Let&apos;s Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
    zIndex: 1,
  },
  titleLine1: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 38,
  },
  titleLine2: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 26,
    width: '66%',
    alignItems: 'center',
    zIndex: 1,
  },
  buttonText: {
    color: '#0B0B0B',
    fontSize: 16,
    fontWeight: '600',
  },
});