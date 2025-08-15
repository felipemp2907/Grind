import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { LayoutAnimation, Platform, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Home, 
  BookOpen, 
  BarChart, 
  Calendar,
  Brain,
  Settings
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import 'react-native-reanimated';

const TabLayout = memo(function TabLayout() {
  // Enable layout animations for smooth transitions
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  const handleTabPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

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
        animation: Platform.OS !== 'web' ? 'shift' : 'none',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => <BarChart size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          tabBarButton: (props) => {
            const { 
              delayLongPress, 
              disabled, 
              onBlur, 
              onFocus, 
              onLongPress,
              onPressIn,
              onPressOut,
              ...touchableProps 
            } = props;
            
            const touchableOpacityProps: TouchableOpacityProps = {
              ...touchableProps,
              delayLongPress: delayLongPress || undefined,
              disabled: disabled || false,
              onBlur: onBlur || undefined,
              onFocus: onFocus || undefined,
              onLongPress: onLongPress ?? undefined,
              onPressIn: onPressIn || undefined,
              onPressOut: onPressOut || undefined,
              onPress: (e) => {
                handleTabPress();
                props.onPress?.(e);
              }
            };
            
            return <TouchableOpacity {...touchableOpacityProps} />;
          }
        }}
      />
    </Tabs>
  );
});

export default TabLayout;