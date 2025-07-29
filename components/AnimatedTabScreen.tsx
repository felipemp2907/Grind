import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform } from 'react-native';
import { useSegments } from 'expo-router';

interface AnimatedTabScreenProps {
  children: React.ReactNode;
  tabName: string;
}

const tabOrder = ['index', 'tasks', 'calendar', 'journal', 'coach', 'settings'];
let previousTabIndex = 0;

export default function AnimatedTabScreen({ children, tabName }: AnimatedTabScreenProps) {
  const segments = useSegments();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    const currentSegment = segments[1] || 'index';
    const currentTabIndex = tabOrder.indexOf(currentSegment);
    
    // Only animate if this is the active tab and we're changing tabs
    if (currentSegment === tabName && currentTabIndex !== previousTabIndex) {
      const direction = currentTabIndex > previousTabIndex ? -1 : 1;
      
      // Start from off-screen position
      slideAnim.setValue(direction * screenWidth);
      
      // Animate to center
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      previousTabIndex = currentTabIndex;
    }
  }, [segments, slideAnim, screenWidth, tabName]);
  
  // Skip animation on web to avoid compatibility issues
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }
  
  return (
    <Animated.View 
      style={[
        { flex: 1 },
        {
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}