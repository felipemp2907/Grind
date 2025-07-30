import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions, Platform } from 'react-native';
import { useSegments } from 'expo-router';

interface AnimatedTabWrapperProps {
  children: React.ReactNode;
  tabName: string;
}

const AnimatedTabWrapper: React.FC<AnimatedTabWrapperProps> = ({ children, tabName }) => {
  const segments = useSegments();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const previousTab = useRef<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  
  // Tab order for determining slide direction
  const tabOrder = ['index', 'tasks', 'calendar', 'journal', 'coach', 'settings'];
  
  useEffect(() => {
    const currentTab = segments[1] || 'index';
    
    // Only animate if this is the current tab and we're switching from another tab
    if (currentTab === tabName && previousTab.current && previousTab.current !== currentTab) {
      const prevIndex = tabOrder.indexOf(previousTab.current);
      const currentIndex = tabOrder.indexOf(currentTab);
      
      // Determine slide direction
      const slideDirection = currentIndex > prevIndex ? 1 : -1;
      
      // Start animation from the side
      slideAnim.setValue(slideDirection * screenWidth);
      opacityAnim.setValue(0);
      
      // Animate to center with smooth transition
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: Platform.OS === 'web' ? 250 : 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: Platform.OS === 'web' ? 200 : 250,
          useNativeDriver: true,
        })
      ]).start();
    } else if (currentTab !== tabName && previousTab.current === tabName) {
      // Animate out when leaving this tab
      const currentIndex = tabOrder.indexOf(currentTab);
      const prevIndex = tabOrder.indexOf(tabName);
      const slideDirection = currentIndex > prevIndex ? -1 : 1;
      
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: slideDirection * screenWidth * 0.3, // Subtle slide out
          duration: Platform.OS === 'web' ? 200 : 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: Platform.OS === 'web' ? 150 : 200,
          useNativeDriver: true,
        })
      ]).start();
    }
    
    previousTab.current = currentTab;
  }, [segments, tabName, screenWidth, slideAnim, opacityAnim, tabOrder]);
  
  // Reset animation when component mounts or tab becomes active
  useEffect(() => {
    const currentTab = segments[1] || 'index';
    if (currentTab === tabName) {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
    }
  }, [tabName, segments, slideAnim, opacityAnim]);
  
  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedTabWrapper;