import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

type ProgressBarProps = {
  progress: number; // 0 to 1
  height?: number;
  label?: string;
  showPercentage?: boolean;
};

export default function ProgressBar({ 
  progress, 
  height = 8, 
  label, 
  showPercentage = false 
}: ProgressBarProps) {
  // Ensure progress is between 0 and 1
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const percentage = Math.round(clampedProgress * 100);
  
  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {showPercentage && <Text style={styles.percentage}>{percentage}%</Text>}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View 
          style={[
            styles.progress, 
            { 
              width: `${percentage}%`,
              height 
            }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  track: {
    width: '100%',
    backgroundColor: Colors.dark.inactive,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
});