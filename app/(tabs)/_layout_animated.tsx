import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimatedTabNavigator } from '@/components/transitions/AnimatedTabNavigator';
import { CustomTabBar } from '@/components/transitions/CustomTabBar';

// Import all tab screen components
import DashboardScreen from './index';
import TasksScreen from './tasks';
import CalendarScreen from './calendar';
import JournalScreen from './journal';
import CoachScreen from './coach';
import SettingsScreen from './settings';

const routes = [
  { key: 'index', component: DashboardScreen },
  { key: 'tasks', component: TasksScreen },
  { key: 'calendar', component: CalendarScreen },
  { key: 'journal', component: JournalScreen },
  { key: 'coach', component: CoachScreen },
  { key: 'settings', component: SettingsScreen },
];

const AnimatedTabLayout = memo(function AnimatedTabLayout() {
  const [activeTab, setActiveTab] = useState<string>('index');

  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey);
  }, []);

  return (
    <View style={styles.container}>
      <AnimatedTabNavigator
        routes={routes}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <CustomTabBar activeTab={activeTab} />
      </AnimatedTabNavigator>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedTabLayout;