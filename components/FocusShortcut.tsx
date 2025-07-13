import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Timer, Focus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTaskStore } from '@/store/taskStore';
import { getTodayDate } from '@/utils/dateUtils';

interface FocusShortcutProps {
  testID?: string;
}

export default function FocusShortcut({ testID = 'focus-shortcut' }: FocusShortcutProps) {
  const router = useRouter();
  const { getTasks } = useTaskStore();
  
  const todayTasks = getTasks(getTodayDate());
  const inProgressTasks = todayTasks.filter(task => !task.completed && !task.isHabit);
  
  // Only show if there are tasks in progress
  if (inProgressTasks.length === 0) {
    return null;
  }
  
  const handlePress = () => {
    // Navigate to focus mode or show focus prompt
    router.push('/focus-mode');
  };
  
  return (
    <TouchableOpacity 
      testID={testID}
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Timer size={20} color={Colors.dark.warning} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Start Focus Session</Text>
          <Text style={styles.description}>
            {inProgressTasks.length} task{inProgressTasks.length !== 1 ? 's' : ''} waiting
          </Text>
        </View>
        <Focus size={16} color={Colors.dark.subtext} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.warning,
    ...Colors.common.shadow,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
});