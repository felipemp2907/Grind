import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Target, TrendingUp, Zap, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Goal } from '@/types';
import { useGoalStore } from '@/store/goalStore';
import CountdownTimer from './CountdownTimer';

type GoalCardProps = {
  goal: Goal;
  isActive?: boolean;
  onPress?: () => void;
};

export default function GoalCard({ goal, isActive = false, onPress }: GoalCardProps) {
  const { getGoalProgress, getDaysRemaining } = useGoalStore();
  
  const progressPercentage = getGoalProgress(goal.id);
  const daysRemaining = getDaysRemaining(goal.id);
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isActive && styles.activeContainer
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Target size={20} color={isActive ? Colors.dark.primary : Colors.dark.subtext} />
        </View>
        <View style={styles.titleContainer}>
          <Text 
            style={[
              styles.title,
              isActive && styles.activeTitle
            ]}
            numberOfLines={1}
          >
            {goal.title}
          </Text>
          <Text style={styles.status}>
            {goal.status === 'active' ? 'Active' : goal.status === 'completed' ? 'Completed' : 'Paused'}
          </Text>
        </View>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {goal.description}
      </Text>
      
      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <TrendingUp size={14} color={Colors.dark.success} />
          <Text style={styles.progressText}>
            {goal.progressValue} / {goal.targetValue} {goal.unit}
          </Text>
          <Text style={styles.progressPercentage}>
            {progressPercentage.toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${Math.min(progressPercentage, 100)}%` }
            ]} 
          />
        </View>
      </View>
      
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Zap size={12} color={Colors.dark.warning} />
          <Text style={styles.statText}>{goal.xpEarned} XP</Text>
        </View>
        
        <View style={styles.statItem}>
          <Calendar size={12} color={Colors.dark.primary} />
          <Text style={styles.statText}>{goal.streakCount} day streak</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statText}>
            {daysRemaining} days left
          </Text>
        </View>
      </View>
      
      <CountdownTimer 
        targetDate={goal.deadline} 
        size="small"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Colors.common.shadow,
  },
  activeContainer: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  activeTitle: {
    color: Colors.dark.primary,
  },
  status: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 12,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: Colors.dark.text,
    marginLeft: 4,
    flex: 1,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.dark.success,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.dark.inactive,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.success,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
});