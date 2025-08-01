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
        <Text style={styles.title}>Welcome to the Grind.</Text>
        
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
    transform: [{ translateX: -250 }, { translateY: -250 }],
    width: 500,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
  },
  ring1: {
    width: 500,
    height: 500,
    backgroundColor: '#2A2A2A',
  },
  ring2: {
    width: 380,
    height: 380,
    backgroundColor: '#0B0B0B',
  },
  ring3: {
    width: 260,
    height: 260,
    backgroundColor: '#1A1A1A',
  },
  centerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
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