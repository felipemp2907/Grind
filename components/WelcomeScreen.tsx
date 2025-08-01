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
          <View style={styles.centerCircle}>
            <View style={styles.innerCircle} />
          </View>
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
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    marginTop: -160,
    marginLeft: -160,
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
  },
  ring1: {
    width: 320,
    height: 320,
    backgroundColor: '#505050',
  },
  ring2: {
    width: 240,
    height: 240,
    backgroundColor: '#0B0B0B',
  },
  ring3: {
    width: 160,
    height: 160,
    backgroundColor: '#404040',
  },
  centerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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