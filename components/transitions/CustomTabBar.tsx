import React, { memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { 
  Home, 
  BookOpen, 
  BarChart, 
  Calendar,
  Brain,
  Settings
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface TabBarProps {
  activeTab: string;
  onTabPress?: (tabKey: string) => void;
}

const tabs = [
  { key: 'index', title: 'Home', icon: Home },
  { key: 'tasks', title: 'Tasks', icon: BarChart },
  { key: 'calendar', title: 'Calendar', icon: Calendar },
  { key: 'journal', title: 'Journal', icon: BookOpen },
  { key: 'coach', title: 'AI', icon: Brain },
  { key: 'settings', title: 'Settings', icon: Settings },
];

export const CustomTabBar: React.FC<TabBarProps> = memo(({ activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress?.(tab.key)}
            activeOpacity={0.7}
          >
            <Icon 
              size={24} 
              color={isActive ? Colors.dark.primary : Colors.dark.inactive} 
            />
            <Text 
              style={[
                styles.tabLabel,
                { color: isActive ? Colors.dark.primary : Colors.dark.inactive }
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

CustomTabBar.displayName = 'CustomTabBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderTopColor: Colors.dark.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    paddingHorizontal: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});