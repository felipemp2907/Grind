import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface TabTransitionContextType {
  isTransitioning: boolean;
  currentTab: string;
  previousTab: string;
}

const TabTransitionContext = createContext<TabTransitionContextType>({
  isTransitioning: false,
  currentTab: '/',
  previousTab: '/',
});

export const useTabTransition = () => useContext(TabTransitionContext);

const TAB_ORDER = ['/', '/tasks', '/calendar', '/journal', '/coach', '/settings'];

interface TabTransitionProviderProps {
  children: React.ReactNode;
}

export const TabTransitionProvider: React.FC<TabTransitionProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTab, setCurrentTab] = useState('/');
  const [previousTab, setPreviousTab] = useState('/');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const normalizedPath = pathname === '/index' ? '/' : pathname;
    
    if (normalizedPath !== currentTab && TAB_ORDER.includes(normalizedPath)) {
      setIsTransitioning(true);
      setPreviousTab(currentTab);
      setCurrentTab(normalizedPath);
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, currentTab]);

  const contextValue: TabTransitionContextType = {
    isTransitioning,
    currentTab,
    previousTab,
  };

  return (
    <TabTransitionContext.Provider value={contextValue}>
      {children}
    </TabTransitionContext.Provider>
  );
};

interface AnimatedTabScreenProps {
  children: React.ReactNode;
  tabPath: string;
}

export const AnimatedTabScreen: React.FC<AnimatedTabScreenProps> = ({ children, tabPath }) => {
  const { isTransitioning, currentTab, previousTab } = useTabTransition();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const normalizedPath = tabPath === '/index' ? '/' : tabPath;
    const isCurrentTab = normalizedPath === currentTab;
    const wasPreviousTab = normalizedPath === previousTab;

    if (isTransitioning) {
      if (isCurrentTab) {
        // Animate in from right
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        const previousIndex = TAB_ORDER.indexOf(previousTab);
        const fromRight = currentIndex > previousIndex;
        
        translateX.value = fromRight ? 100 : -100;
        // Keep opacity at 1 to prevent blank screen
        opacity.value = 1;
        
        translateX.value = withTiming(0, { duration: 300 });
      } else if (wasPreviousTab) {
        // Animate out to left
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        const previousIndex = TAB_ORDER.indexOf(previousTab);
        const toLeft = currentIndex > previousIndex;
        
        translateX.value = withTiming(toLeft ? -100 : 100, { duration: 300 });
        // Keep opacity at 1 during transition to prevent blank screen
        opacity.value = 1;
      }
    } else {
      // Always ensure tabs are visible and positioned correctly
      const normalizedPath = tabPath === '/index' ? '/' : tabPath;
      const isCurrentTab = normalizedPath === currentTab;
      
      if (isCurrentTab) {
        translateX.value = 0;
        opacity.value = 1;
      } else {
        // Hide non-current tabs by moving them off-screen
        opacity.value = 0;
      }
    }
  }, [isTransitioning, currentTab, previousTab, tabPath, translateX, opacity]);

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
    return <>{children}</>;
  }

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};