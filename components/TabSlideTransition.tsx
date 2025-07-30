import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface TabSlideTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  direction: 'left' | 'right';
  onTransitionComplete?: () => void;
}

const TabSlideTransition: React.FC<TabSlideTransitionProps> = ({
  children,
  isActive,
  direction,
  onTransitionComplete,
}) => {
  const translateX = useSharedValue(isActive ? 0 : (direction === 'left' ? -100 : 100));
  const opacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Fallback for web - no animation
      return;
    }

    const targetTranslateX = isActive ? 0 : (direction === 'left' ? -100 : 100);
    const targetOpacity = isActive ? 1 : 0;

    translateX.value = withTiming(targetTranslateX, {
      duration: 300,
    }, (finished) => {
      if (finished && onTransitionComplete) {
        runOnJS(onTransitionComplete)();
      }
    });

    opacity.value = withTiming(targetOpacity, {
      duration: 300,
    });
  }, [isActive, direction, translateX, opacity, onTransitionComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {};
    }

    return {
      transform: [{ translateX: `${translateX.value}%` }],
      opacity: opacity.value,
    };
  });

  if (Platform.OS === 'web') {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TabSlideTransition;