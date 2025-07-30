import React from 'react';
import { View } from 'react-native';

// Import the actual tab screen components
import DashboardScreen from '@/app/(tabs)/index';
import TasksScreen from '@/app/(tabs)/tasks';
import CalendarScreen from '@/app/(tabs)/calendar';
import JournalScreen from '@/app/(tabs)/journal';
import CoachScreen from '@/app/(tabs)/coach';
import SettingsScreen from '@/app/(tabs)/settings';

// Wrapper components that remove SafeAreaView since AnimatedTabNavigator handles it
export const HomeTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <DashboardScreen />
    </View>
  );
};

export const TasksTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <TasksScreen />
    </View>
  );
};

export const CalendarTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <CalendarScreen />
    </View>
  );
};

export const JournalTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <JournalScreen />
    </View>
  );
};

export const CoachTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <CoachScreen />
    </View>
  );
};

export const SettingsTabScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen />
    </View>
  );
};