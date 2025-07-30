import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface TabScreenAnimatorProps {
  children: React.ReactNode;
}

export default function TabScreenAnimator({ children }: TabScreenAnimatorProps) {
  const translateX = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      // Reset values for incoming animation
      translateX.setValue(50);
      opacity.setValue(0);
      
      // Animate in from right to center
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: Platform.OS === 'web' ? 150 : 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Platform.OS === 'web' ? 150 : 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isFocused, translateX, opacity]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateX }],
          opacity
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});