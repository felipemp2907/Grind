import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy, Calendar, Flame, Target, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Challenge } from '@/types';

interface ChallengeCardProps {
  challenge?: Challenge;
  challengeCode?: '75_hard' | '30_day' | 'goggins_4x4x48';
  onStart?: () => void;
  onContinue?: () => void;
  isActive?: boolean;
}

const CHALLENGE_INFO = {
  '75_hard': {
    title: '75 Hard Challenge',
    description: 'The ultimate mental toughness challenge',
    icon: <Flame size={24} color={Colors.dark.danger} />,
    color: Colors.dark.danger,
    difficulty: 'EXTREME'
  },
  '30_day': {
    title: '30-Day Discipline',
    description: 'Build unbreakable discipline',
    icon: <Target size={24} color={Colors.dark.warning} />,
    color: Colors.dark.warning,
    difficulty: 'HARD'
  },
  'goggins_4x4x48': {
    title: 'Goggins 4x4x48',
    description: '48 hours of pure mental warfare',
    icon: <Zap size={24} color={Colors.dark.primary} />,
    color: Colors.dark.primary,
    difficulty: 'INSANE'
  }
};

export default function ChallengeCard({ 
  challenge, 
  challengeCode, 
  onStart, 
  onContinue, 
  isActive = false 
}: ChallengeCardProps) {
  const info = challenge 
    ? CHALLENGE_INFO[challenge.code] 
    : challengeCode 
    ? CHALLENGE_INFO[challengeCode] 
    : null;
    
  if (!info) return null;
  
  const progressPercentage = challenge 
    ? ((challenge.dayIndex - 1) / challenge.totalDays) * 100 
    : 0;
    
  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {info.icon}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: info.color + '20' }]}>
          <Text style={[styles.difficultyText, { color: info.color }]}>
            {info.difficulty}
          </Text>
        </View>
      </View>
      
      {challenge && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Day {challenge.dayIndex} of {challenge.totalDays}
            </Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%`, backgroundColor: info.color }
              ]} 
            />
          </View>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: info.color }]}
        onPress={challenge ? onContinue : onStart}
      >
        <Text style={styles.actionButtonText}>
          {challenge ? 'Continue Challenge' : 'Start Challenge'}
        </Text>
        {challenge ? (
          <Calendar size={16} color={Colors.dark.text} />
        ) : (
          <Trophy size={16} color={Colors.dark.text} />
        )}
      </TouchableOpacity>
    </View>
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
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.dark.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginRight: 8,
  },
});