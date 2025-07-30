import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { LayoutAnimation, Platform } from 'react-native';
import { 
  Home, 
  BookOpen, 
  BarChart, 
  Calendar,
  Brain,
  Settings
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import TabScreenAnimator from '@/components/TabScreenAnimator';

// Import screen components
import DashboardScreen from './index';
import TasksScreen from './tasks';
import CalendarScreen from './calendar';
import JournalScreen from './journal';
import CoachScreen from './coach';
import SettingsScreen from './settings';

const TabLayout = memo(function TabLayout() {
  // Enable layout animations for smooth transitions
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.inactive,
        tabBarStyle: {
          backgroundColor: Colors.dark.card,
          borderTopColor: Colors.dark.separator,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <DashboardScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <BarChart size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <TasksScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <CalendarScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <JournalScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="coach"
        options={{
          title: "AI",
          tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <CoachScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
        }}
      >
        {() => (
          <TabScreenAnimator>
            <SettingsScreen />
          </TabScreenAnimator>
        )}
      </Tabs.Screen>
    </Tabs>
  );
});

export default TabLayout;