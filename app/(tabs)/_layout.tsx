import React, { memo, useRef, useEffect } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Platform, Animated, Dimensions } from 'react-native';
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
  const segments = useSegments();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const previousTab = useRef<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  
  // Tab order for determining slide direction
  const tabOrder = ['index', 'tasks', 'calendar', 'journal', 'coach', 'settings'];
  
  useEffect(() => {
    const currentTab = segments[1] || 'index'; // Get current tab from segments
    
    if (previousTab.current && previousTab.current !== currentTab) {
      const prevIndex = tabOrder.indexOf(previousTab.current);
      const currentIndex = tabOrder.indexOf(currentTab);
      
      // Determine slide direction
      const slideDirection = currentIndex > prevIndex ? 1 : -1;
      
      // Start from opposite side
      slideAnim.setValue(slideDirection * screenWidth);
      
      // Animate to center
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    previousTab.current = currentTab;
  }, [segments, screenWidth]);

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
        // Add animation wrapper to each screen
        sceneContainerStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <BarChart size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "AI",
          tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
        }}
      />
    </Tabs>
  );
});

export default TabLayout;