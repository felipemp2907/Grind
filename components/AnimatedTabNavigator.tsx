import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

const { width: screenWidth } = Dimensions.get('window');

interface TabConfig {
  name: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  component: React.ComponentType<any>;
}

interface AnimatedTabNavigatorProps {
  tabs: TabConfig[];
  initialTab?: number;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
};

const SWIPE_THRESHOLD = screenWidth * 0.25;
const SWIPE_VELOCITY_THRESHOLD = 500;

export default function AnimatedTabNavigator({ tabs, initialTab = 0 }: AnimatedTabNavigatorProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const translateX = useSharedValue(-initialTab * screenWidth);
  const gestureTranslateX = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const animateToTab = (tabIndex: number) => {
    'worklet';
    translateX.value = withSpring(-tabIndex * screenWidth, SPRING_CONFIG);
    runOnJS(setActiveTab)(tabIndex);
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>(
    {
      onStart: () => {
        gestureTranslateX.value = 0;
      },
      onActive: (event) => {
        const { translationX } = event;
        
        // Limit the gesture to prevent over-scrolling
        const maxTranslation = screenWidth * (tabs.length - 1);
        const minTranslation = 0;
        
        const currentOffset = -activeTab * screenWidth;
        const newTranslation = Math.max(
          -maxTranslation,
          Math.min(minTranslation, currentOffset + translationX)
        );
        
        gestureTranslateX.value = translationX;
        translateX.value = newTranslation;
      },
      onEnd: (event) => {
        const { translationX, velocityX } = event;
        
        let targetTab = activeTab;
        
        // Determine target tab based on swipe distance and velocity
        if (Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD) {
          if (translationX > 0 && velocityX > -SWIPE_VELOCITY_THRESHOLD) {
            // Swipe right - go to previous tab
            targetTab = Math.max(0, activeTab - 1);
          } else if (translationX < 0 && velocityX < SWIPE_VELOCITY_THRESHOLD) {
            // Swipe left - go to next tab
            targetTab = Math.min(tabs.length - 1, activeTab + 1);
          }
        }
        
        gestureTranslateX.value = 0;
        animateToTab(targetTab);
      },
    },
    [activeTab, tabs.length]
  );

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleTabPress = (index: number) => {
    if (index !== activeTab) {
      animateToTab(index);
    }
  };

  // Web compatibility check
  const TabContainer = Platform.OS === 'web' ? View : PanGestureHandler;
  const tabContainerProps = Platform.OS === 'web' ? {} : {
    onGestureEvent: gestureHandler,
  };

  return (
    <View style={styles.container}>
      <TabContainer {...tabContainerProps}>
        <Animated.View style={[styles.tabContainer, containerStyle]}>
          {tabs.map((tab, index) => {
            const TabComponent = tab.component;
            return (
              <View key={tab.name} style={styles.tabContent}>
                <TabComponent />
              </View>
            );
          })}
        </Animated.View>
      </TabContainer>
      
      {/* Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab, index) => {
          const IconComponent = tab.icon;
          const isActive = index === activeTab;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              <IconComponent
                size={24}
                color={isActive ? Colors.dark.primary : Colors.dark.inactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? Colors.dark.primary : Colors.dark.inactive }
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    width: screenWidth * 6, // Assuming 6 tabs max
  },
  tabContent: {
    width: screenWidth,
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderTopColor: Colors.dark.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});