import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Target } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Goal } from '@/types';
import CountdownTimer from './CountdownTimer';

type GoalCardProps = {
  goal: Goal;
  isActive?: boolean;
  onPress?: () => void;
};

export default function GoalCard({ goal, isActive = false, onPress }: GoalCardProps) {
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
        <Text 
          style={[
            styles.title,
            isActive && styles.activeTitle
          ]}
          numberOfLines={1}
        >
          {goal.title}
        </Text>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {goal.description}
      </Text>
      
      <CountdownTimer 
        targetDate={goal.deadline} 
        size="small"
      />
      
      {isActive && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active Goal</Text>
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
    ...Colors.common.shadow,
  },
  activeContainer: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
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
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
  },
  activeTitle: {
    color: Colors.dark.primary,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 12,
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
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