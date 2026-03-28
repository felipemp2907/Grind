import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTimeRemaining } from '@/utils/dateUtils';
import Colors from '@/constants/colors';

type CountdownTimerProps = {
  targetDate: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  onComplete?: () => void;
};

export default function CountdownTimer({ 
  targetDate, 
  title, 
  size = 'medium',
  onComplete 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(targetDate));
  
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeRemaining = getTimeRemaining(targetDate);
      setTimeRemaining(newTimeRemaining);
      
      if (newTimeRemaining.totalSeconds === 0 && onComplete) {
        onComplete();
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate, onComplete]);
  
  const getFontSize = () => {
    switch (size) {
      case 'small': return { unit: 12, number: 18 };
      case 'large': return { unit: 16, number: 32 };
      default: return { unit: 14, number: 24 };
    }
  };
  
  const fontSize = getFontSize();
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.timerContainer}>
        <View style={styles.timeUnit}>
          <Text style={[styles.timeNumber, { fontSize: fontSize.number }]}>{timeRemaining.days}</Text>
          <Text style={[styles.timeLabel, { fontSize: fontSize.unit }]}>days</Text>
        </View>
        <Text style={[styles.timeSeparator, { fontSize: fontSize.number }]}>:</Text>
        <View style={styles.timeUnit}>
          <Text style={[styles.timeNumber, { fontSize: fontSize.number }]}>{timeRemaining.hours.toString().padStart(2, '0')}</Text>
          <Text style={[styles.timeLabel, { fontSize: fontSize.unit }]}>hours</Text>
        </View>
        <Text style={[styles.timeSeparator, { fontSize: fontSize.number }]}>:</Text>
        <View style={styles.timeUnit}>
          <Text style={[styles.timeNumber, { fontSize: fontSize.number }]}>{timeRemaining.minutes.toString().padStart(2, '0')}</Text>
          <Text style={[styles.timeLabel, { fontSize: fontSize.unit }]}>min</Text>
        </View>
        <Text style={[styles.timeSeparator, { fontSize: fontSize.number }]}>:</Text>
        <View style={styles.timeUnit}>
          <Text style={[styles.timeNumber, { fontSize: fontSize.number }]}>{timeRemaining.seconds.toString().padStart(2, '0')}</Text>
          <Text style={[styles.timeLabel, { fontSize: fontSize.unit }]}>sec</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.subtext,
    marginBottom: 5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timeUnit: {
    alignItems: 'center',
    marginHorizontal: 2,
  },
  timeNumber: {
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  timeLabel: {
    color: Colors.dark.subtext,
    marginTop: -2,
  },
  timeSeparator: {
    color: Colors.dark.primary,
    fontWeight: 'bold',
    marginBottom: 15,
  },
});