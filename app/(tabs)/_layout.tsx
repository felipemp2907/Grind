import React, { memo } from 'react';
import { 
  Home, 
  BookOpen, 
  BarChart, 
  Calendar,
  Brain,
  Settings
} from 'lucide-react-native';
import AnimatedTabNavigator from '@/components/AnimatedTabNavigator';
import {
  HomeTabScreen,
  TasksTabScreen,
  CalendarTabScreen,
  JournalTabScreen,
  CoachTabScreen,
  SettingsTabScreen,
} from '@/components/TabScreens';

const TabLayout = memo(function TabLayout() {
  const tabs = [
    {
      name: 'index',
      title: 'Home',
      icon: Home,
      component: HomeTabScreen,
    },
    {
      name: 'tasks',
      title: 'Tasks',
      icon: BarChart,
      component: TasksTabScreen,
    },
    {
      name: 'calendar',
      title: 'Calendar',
      icon: Calendar,
      component: CalendarTabScreen,
    },
    {
      name: 'journal',
      title: 'Journal',
      icon: BookOpen,
      component: JournalTabScreen,
    },
    {
      name: 'coach',
      title: 'AI',
      icon: Brain,
      component: CoachTabScreen,
    },
    {
      name: 'settings',
      title: 'Settings',
      icon: Settings,
      component: SettingsTabScreen,
    },
  ];

  return <AnimatedTabNavigator tabs={tabs} initialTab={0} />;
});

export default TabLayout;