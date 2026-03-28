import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle2, Clock, Target, Flame } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Task, JournalEntry } from '@/types';
import { useGoalStore } from '@/store/goalStore';

type TaskCardProps = {
  task: Task;
  journalEntry?: JournalEntry;
};

export default function TaskCard({ task, journalEntry }: TaskCardProps) {
  const router = useRouter();
  const { goals } = useGoalStore();
  
  // Find the goal this task belongs to
  const goal = goals.find(g => g.id === task.goalId);
  
  const handlePress = () => {
    if (task.completed) {
      // If task is completed, view the journal entry
      router.push(`/journal/${task.journalEntryId}`);
    } else {
      // If task is not completed, go to validation screen
      router.push({
        pathname: '/validate-task',
        params: { taskId: task.id }
      });
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        task.completed ? styles.completedContainer : null,
        task.isUserCreated ? styles.userCreatedContainer : null,
        task.isHabit ? styles.habitContainer : null
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {task.isHabit && (
            <View style={styles.streakBadge}>
              <Flame size={12} color={Colors.dark.warning} />
              <Text style={styles.streakText}>{task.streak}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        </View>
        <View style={styles.xpContainer}>
          <Text style={styles.xpText}>+{task.xpValue} XP</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>{task.description}</Text>
      
      {goal && (
        <View style={styles.goalBadge}>
          <Target size={12} color={Colors.dark.primary} />
          <Text style={styles.goalText}>{goal.title}</Text>
        </View>
      )}
      
      <View style={styles.footer}>
        {task.completed ? (
          <View style={styles.completedBadge}>
            <CheckCircle2 size={16} color={Colors.dark.success} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <View style={styles.actionButton}>
            <Camera size={16} color={Colors.dark.primary} />
            <Text style={styles.actionText}>Upload Proof</Text>
          </View>
        )}
        
        <View style={styles.timeInfo}>
          <Clock size={14} color={Colors.dark.subtext} />
          <Text style={styles.timeText}>
            {task.scheduledTime ? task.scheduledTime : "Today"}
          </Text>
        </View>
      </View>
      
      {task.isUserCreated && (
        <View style={styles.userCreatedBadge}>
          <Text style={styles.userCreatedText}>Custom</Text>
        </View>
      )}
      
      {task.isHabit && !task.isUserCreated && (
        <View style={styles.habitBadge}>
          <Text style={styles.habitText}>Streak</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  completedContainer: {
    opacity: 0.8,
    borderLeftColor: Colors.dark.success,
    borderLeftWidth: 4,
  },
  userCreatedContainer: {
    borderLeftColor: Colors.dark.secondary,
    borderLeftWidth: 4,
  },
  habitContainer: {
    borderLeftColor: Colors.dark.warning,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 12,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  goalText: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 217, 169, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.success,
    marginLeft: 4,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  xpContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 180, 0, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.warning,
    marginLeft: 2,
  },
  userCreatedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  userCreatedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.secondary,
  },
  habitBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  habitText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.warning,
  },
});