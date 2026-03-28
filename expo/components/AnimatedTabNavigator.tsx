import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { usePathname } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedTabNavigatorProps {
  children: React.ReactNode;
}

const TAB_ROUTES = [
  '/',
  '/tasks', 
  '/calendar',
  '/journal',
  '/coach',
  '/settings'
];

const AnimatedTabNavigator: React.FC<AnimatedTabNavigatorProps> = ({ children }) => {
  const pathname = usePathname();
  const translateX = useSharedValue(0);
  const previousIndex = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const normalizedPath = pathname === '/index' ? '/' : pathname;
    const currentIndex = TAB_ROUTES.indexOf(normalizedPath);
    
    if (currentIndex !== -1 && currentIndex !== previousIndex.current) {
      const targetTranslateX = -currentIndex * SCREEN_WIDTH;
      
      translateX.value = withTiming(targetTranslateX, {
        duration: 300,
      });
      
      previousIndex.current = currentIndex;
    }
  }, [pathname, translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {};
    }

    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (Platform.OS === 'web') {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_WIDTH * TAB_ROUTES.length,
  },
});

export default AnimatedTabNavigator;