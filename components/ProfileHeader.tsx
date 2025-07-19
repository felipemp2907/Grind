import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { UserProfile } from '@/types';
import ProgressBar from './ProgressBar';

type ProfileHeaderProps = {
  profile: UserProfile;
};

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const xpProgress = profile.xp / (profile.xp + profile.xpToNextLevel);
  
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {profile.level}</Text>
        </View>
        <Text style={styles.name}>{profile.name || 'Achiever'}</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.streakDays}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.longestStreak}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Level Progress</Text>
          <Text style={styles.progressValue}>
            {profile.xp} / {profile.xp + profile.xpToNextLevel} XP
          </Text>
        </View>
        <ProgressBar progress={xpProgress} height={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Colors.common.shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  levelText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});