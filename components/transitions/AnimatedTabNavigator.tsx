import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SlideTransition } from './SlideTransition';

interface TabRoute {
  key: string;
  component: React.ComponentType<any>;
}

interface AnimatedTabNavigatorProps {
  routes: TabRoute[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  children: React.ReactNode; // Tab bar component
}

// Memoized screen component to prevent unnecessary re-renders
const ScreenWrapper = memo<{
  route: TabRoute;
  isActive: boolean;
  direction: 'left' | 'right';
}>(({ route, isActive, direction }) => {
  const Component = route.component;
  
  return (
    <View
      style={[
        styles.screen,
        { zIndex: isActive ? 1 : 0 }
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      <SlideTransition
        isActive={isActive}
        direction={direction}
      >
        <Component />
      </SlideTransition>
    </View>
  );
});

ScreenWrapper.displayName = 'ScreenWrapper';

export const AnimatedTabNavigator: React.FC<AnimatedTabNavigatorProps> = memo(({
  routes,
  activeTab,
  onTabChange,
  children,
}) => {
  const [previousTab, setPreviousTab] = useState<string>(activeTab);

  const activeIndex = useMemo(() => 
    routes.findIndex(route => route.key === activeTab), 
    [routes, activeTab]
  );

  const handleTabChange = useCallback((newTab: string) => {
    if (newTab !== activeTab) {
      setPreviousTab(activeTab);
      onTabChange(newTab);
    }
  }, [activeTab, onTabChange]);

  const getDirection = useCallback((routeKey: string): 'left' | 'right' => {
    const routeIndex = routes.findIndex(route => route.key === routeKey);
    return routeIndex > activeIndex ? 'right' : 'left';
  }, [routes, activeIndex]);

  // For web compatibility, render without animations
  if (Platform.OS === 'web') {
    const ActiveComponent = routes.find(route => route.key === activeTab)?.component;
    
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {ActiveComponent && <ActiveComponent />}
        </View>
        <View style={styles.tabBar}>
          {React.cloneElement(children as React.ReactElement, {
            onTabPress: handleTabChange,
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {routes.map((route) => {
          const isActive = route.key === activeTab;
          const direction = getDirection(route.key);

          return (
            <ScreenWrapper
              key={route.key}
              route={route}
              isActive={isActive}
              direction={direction}
            />
          );
        })}
      </View>
      <View style={styles.tabBar}>
        {React.cloneElement(children as React.ReactElement, {
          onTabPress: handleTabChange,
        })}
      </View>
    </View>
  );
});

AnimatedTabNavigator.displayName = 'AnimatedTabNavigator';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBar: {
    // Tab bar styling will be handled by the child component
  },
});