import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabScreen {
  key: string;
  title: string;
  component: React.ComponentType<any>;
  icon: React.ComponentType<{ color: string; size: number }>;
}

interface AnimatedTabNavigatorProps {
  screens: TabScreen[];
  initialTab?: string;
}

const AnimatedTabNavigator: React.FC<AnimatedTabNavigatorProps> = ({
  screens,
  initialTab,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(initialTab || screens[0]?.key || '');
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const activeIndex = useMemo(() => {
    return screens.findIndex(screen => screen.key === activeTab);
  }, [activeTab, screens]);

  const switchTab = useCallback((tabKey: string) => {
    if (tabKey === activeTab || isAnimating.value) return;

    const newIndex = screens.findIndex(screen => screen.key === tabKey);
    const currentIndex = activeIndex;
    
    if (newIndex === -1) return;

    isAnimating.value = true;
    
    // Calculate direction and distance
    const direction = newIndex > currentIndex ? -1 : 1;
    const distance = Math.abs(newIndex - currentIndex) * SCREEN_WIDTH;
    
    translateX.value = withTiming(
      direction * distance,
      { duration: 300 },
      (finished) => {
        if (finished) {
          runOnJS(() => {
            setActiveTab(tabKey);
            translateX.value = 0;
            isAnimating.value = false;
          })();
        }
      }
    );
  }, [activeTab, activeIndex, screens, translateX, isAnimating]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderTabContent = () => {
    return screens.map((screen, index) => {
      const Screen = screen.component;
      const isActive = screen.key === activeTab;
      
      return (
        <View
          key={screen.key}
          style={[
            styles.screenContainer,
            { width: SCREEN_WIDTH },
          ]}
        >
          {isActive && <Screen />}
        </View>
      );
    });
  };

  const renderTabBar = () => {
    return (
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {screens.map((screen) => {
          const isActive = screen.key === activeTab;
          const Icon = screen.icon;
          
          return (
            <Animated.View
              key={screen.key}
              style={[
                styles.tabItem,
                isActive && styles.activeTabItem,
              ]}
            >
              <Animated.Pressable
                style={styles.tabButton}
                onPress={() => switchTab(screen.key)}
              >
                <Icon
                  color={isActive ? Colors.dark.primary : Colors.dark.inactive}
                  size={24}
                />
                <Animated.Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? Colors.dark.primary : Colors.dark.inactive,
                    },
                  ]}
                >
                  {screen.title}
                </Animated.Text>
              </Animated.Pressable>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, containerStyle]}>
        {renderTabContent()}
      </Animated.View>
      {renderTabBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.separator,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  activeTabItem: {
    // Add any active tab styling here
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 50,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default AnimatedTabNavigator;