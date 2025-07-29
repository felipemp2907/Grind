import { Platform } from 'react-native';
import { 
  interpolate, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';

export interface SlideTransitionConfig {
  duration?: number;
  direction?: 'left' | 'right';
}

export const useSlideTransition = (
  isActive: boolean, 
  config: SlideTransitionConfig = {}
) => {
  const { duration = 300, direction = 'right' } = config;
  const translateX = useSharedValue(isActive ? 0 : (direction === 'right' ? 100 : -100));
  const opacity = useSharedValue(isActive ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(
            isActive ? 0 : (direction === 'right' ? 100 : -100),
            { duration }
          ),
        },
      ],
      opacity: withTiming(isActive ? 1 : 0, { duration }),
    };
  });

  return animatedStyle;
};

export const createSlideInterpolator = (screenWidth: number) => {
  return (progress: number, direction: 'left' | 'right' = 'right') => {
    'worklet';
    const translateX = interpolate(
      progress,
      [0, 1],
      direction === 'right' ? [screenWidth, 0] : [-screenWidth, 0]
    );
    
    return {
      transform: [{ translateX }],
      opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]),
    };
  };
};