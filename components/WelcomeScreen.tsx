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
  ringsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
  },
  ring1: {
    width: 600,
    height: 600,
    backgroundColor: '#404040',
  },
  ring2: {
    width: 450,
    height: 450,
    backgroundColor: '#0B0B0B',
  },
  ring3: {
    width: 300,
    height: 300,
    backgroundColor: '#303030',
  },
  centerCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#606060',
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