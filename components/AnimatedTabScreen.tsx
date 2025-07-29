import React from 'react';
import { StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedTabScreenProps {
  children: React.ReactNode;
  index?: number;
}

const AnimatedTabScreen: React.FC<AnimatedTabScreenProps> = ({
  children,
  index = 0,
}) => {
  const translateX = useSharedValue(SCREEN_WIDTH);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useFocusEffect(
    React.useCallback(() => {
      // Only animate on native platforms to avoid web compatibility issues
      if (Platform.OS === 'web') {
        translateX.value = 0;
        opacity.value = 1;
        scale.value = 1;
        return;
      }

      // Animate in when screen comes into focus
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.1)),
      });

      return () => {
        // Reset values when screen loses focus
        if (Platform.OS !== 'web') {
          translateX.value = -SCREEN_WIDTH;
          opacity.value = 0;
          scale.value = 0.95;
        }
      };
    }, [translateX, opacity, scale])
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {
        flex: 1,
      };
    }

    return {
      transform: [
        {
          translateX: translateX.value,
        },
        {
          scale: scale.value,
        },
      ],
      opacity: opacity.value,
    };
  });

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

export default AnimatedTabScreen;