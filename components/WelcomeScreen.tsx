import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/store/userStore';

export default function WelcomeScreen() {
  const { markWelcomeSeen } = useUserStore();
  
  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    markWelcomeSeen();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Concentric rings background */}
        <View style={styles.ringsContainer}>
          <View style={[styles.ring, styles.ring1]} />
          <View style={[styles.ring, styles.ring2]} />
          <View style={[styles.ring, styles.ring3]} />
          <View style={styles.centerCircle} />
        </View>
        
        {/* Welcome text */}
        <Text style={styles.title}>Welcome to{"\n"}Grind</Text>
        
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
  ringsContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -200 }, { translateY: -200 }],
    width: 400,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
  },
  ring1: {
    width: 400,
    height: 400,
    backgroundColor: '#141414',
  },
  ring2: {
    width: 300,
    height: 300,
    backgroundColor: '#181818',
  },
  ring3: {
    width: 200,
    height: 200,
    backgroundColor: '#1E1E1E',
  },
  centerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0B0B0B',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 48,
    zIndex: 1,
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