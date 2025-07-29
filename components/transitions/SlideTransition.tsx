import React, { useEffect, useMemo } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  direction: 'left' | 'right';
  onTransitionComplete?: () => void;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  isActive,
  direction,
  onTransitionComplete,
}) => {
  const translateX = useSharedValue(isActive ? 0 : direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH);
  const opacity = useSharedValue(isActive ? 1 : 0);

  // Memoize timing config for better performance
  const timingConfig = useMemo(() => ({
    duration: 300,
    easing: Easing.out(Easing.cubic),
  }), []);

  useEffect(() => {
    const targetTranslateX = isActive ? 0 : direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const targetOpacity = isActive ? 1 : 0;

    translateX.value = withTiming(targetTranslateX, timingConfig, (finished) => {
      if (finished && onTransitionComplete) {
        runOnJS(onTransitionComplete)();
      }
    });

    opacity.value = withTiming(targetOpacity, timingConfig);
  }, [isActive, direction, translateX, opacity, onTransitionComplete, timingConfig]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  }, []);

  // For web compatibility, use conditional rendering
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, opacity: isActive ? 1 : 0 }}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};