import React, { memo, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { 
  Home, 
  BookOpen, 
  BarChart, 
  Calendar,
  Brain,
  Settings
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const TabLayout = memo(function TabLayout() {
  // Memoize tab icons for performance
  const tabIcons = useMemo(() => ({
    home: ({ color, size }: { color: string; size: number }) => <Home size={size} color={color} />,
    tasks: ({ color, size }: { color: string; size: number }) => <BarChart size={size} color={color} />,
    calendar: ({ color, size }: { color: string; size: number }) => <Calendar size={size} color={color} />,
    journal: ({ color, size }: { color: string; size: number }) => <BookOpen size={size} color={color} />,
    coach: ({ color, size }: { color: string; size: number }) => <Brain size={size} color={color} />,
    settings: ({ color, size }: { color: string; size: number }) => <Settings size={size} color={color} />,
  }), []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.inactive,
        tabBarStyle: {
          backgroundColor: Colors.dark.card,
          borderTopColor: Colors.dark.separator,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500' as const,
        },
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: {
          fontWeight: 'bold' as const,
        },
        headerShadowVisible: false,
        // Enable slide animations for native platforms
        ...(Platform.OS !== 'web' && {
          animation: 'slide_from_right',
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcons.home,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: tabIcons.tasks,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: tabIcons.calendar,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: tabIcons.journal,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "AI",
          tabBarIcon: tabIcons.coach,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: tabIcons.settings,
        }}
      />
    </Tabs>
  );
});

export default TabLayout;