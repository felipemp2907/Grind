import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Timer, 
  Play, 
  Pause, 
  Square, 
  CheckCircle,
  Focus
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { getTodayDate } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';

export default function FocusModeScreen() {
  const router = useRouter();
  const { getTasks } = useTaskStore();
  const { addXP } = useUserStore();
  
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  const todayTasks = getTasks(getTodayDate());
  const inProgressTasks = todayTasks.filter(task => !task.completed && !task.isHabit);
  
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timer]);
  
  const startSession = () => {
    setIsActive(true);
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(interval);
  };
  
  const pauseSession = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setIsActive(false);
  };
  
  const resumeSession = () => {
    setIsActive(true);
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(interval);
  };
  
  const stopSession = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setIsActive(false);
    setTimeRemaining(25 * 60);
  };
  
  const completeSession = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    
    setIsActive(false);
    setSessionCompleted(true);
    
    // Award XP for completing focus session
    addXP(50);
    
    // Provide completion haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getProgressPercentage = () => {
    const totalTime = 25 * 60;
    return ((totalTime - timeRemaining) / totalTime) * 100;
  };
  
  if (sessionCompleted) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: "Focus Complete!",
            headerBackVisible: false
          }} 
        />
        
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.completionContainer}>
            <CheckCircle size={80} color={Colors.dark.success} />
            <Text style={styles.completionTitle}>
              🎉 Focus Session Complete!
            </Text>
            <Text style={styles.completionText}>
              You completed a 25-minute focus session and earned 50 XP!
            </Text>
            
            <View style={styles.completionActions}>
              <Button
                title="Start Another Session"
                onPress={() => {
                  setSessionCompleted(false);
                  setTimeRemaining(25 * 60);
                }}
                style={styles.actionButton}
              />
              <Button
                title="Back to Dashboard"
                onPress={() => router.back()}
                variant="outline"
                style={styles.actionButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "Focus Mode",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.headerButton}>Done</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Focus size={32} color={Colors.dark.primary} />
            <Text style={styles.title}>Focus Session</Text>
            <Text style={styles.subtitle}>
              Eliminate distractions and boost productivity
            </Text>
          </View>
          
          {inProgressTasks.length > 0 && (
            <View style={styles.tasksContainer}>
              <Text style={styles.tasksTitle}>
                Tasks waiting for you:
              </Text>
              {inProgressTasks.slice(0, 3).map((task, index) => (
                <Text key={task.id} style={styles.taskItem}>
                  • {task.title}
                </Text>
              ))}
              {inProgressTasks.length > 3 && (
                <Text style={styles.taskItem}>
                  • +{inProgressTasks.length - 3} more tasks
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <View 
                style={[
                  styles.progressRing,
                  { 
                    transform: [{ rotate: `${(getProgressPercentage() * 3.6)}deg` }],
                    opacity: isActive ? 1 : 0.3
                  }
                ]} 
              />
              <Timer size={48} color={isActive ? Colors.dark.success : Colors.dark.primary} />
              <Text style={[
                styles.timerText,
                { color: isActive ? Colors.dark.success : Colors.dark.primary }
              ]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
          
          <View style={styles.controls}>
            {!isActive && timeRemaining === 25 * 60 ? (
              <Button
                title="Start 25-Min Focus"
                onPress={startSession}
                icon={<Play size={20} color={Colors.dark.text} />}
                style={styles.primaryButton}
              />
            ) : !isActive ? (
              <View style={styles.pausedControls}>
                <Button
                  title="Resume"
                  onPress={resumeSession}
                  icon={<Play size={16} color={Colors.dark.text} />}
                  style={styles.controlButton}
                />
                <Button
                  title="Reset"
                  onPress={stopSession}
                  variant="outline"
                  icon={<Square size={16} color={Colors.dark.primary} />}
                  style={styles.controlButton}
                />
              </View>
            ) : (
              <View style={styles.activeControls}>
                <Button
                  title="Pause"
                  onPress={pauseSession}
                  variant="outline"
                  icon={<Pause size={16} color={Colors.dark.primary} />}
                  style={styles.controlButton}
                />
                <Button
                  title="Stop"
                  onPress={stopSession}
                  variant="danger"
                  icon={<Square size={16} color={Colors.dark.text} />}
                  style={styles.controlButton}
                />
              </View>
            )}
          </View>
          
          {isActive && (
            <View style={styles.focusIndicator}>
              <Text style={styles.focusIndicatorText}>
                🎯 Focus mode active - Stay on track!
              </Text>
            </View>
          )}
          
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Focus Tips:</Text>
            <Text style={styles.tipItem}>• Close unnecessary apps and tabs</Text>
            <Text style={styles.tipItem}>• Put your phone in silent mode</Text>
            <Text style={styles.tipItem}>• Work on one task at a time</Text>
            <Text style={styles.tipItem}>• Take breaks between sessions</Text>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerButton: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  tasksContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  taskItem: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 4,
    borderColor: Colors.dark.separator,
  },
  progressRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: Colors.dark.success,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  controls: {
    marginBottom: 32,
  },
  primaryButton: {
    marginBottom: 16,
  },
  pausedControls: {
    flexDirection: 'row',
    gap: 12,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
  },
  focusIndicator: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.success,
  },
  focusIndicatorText: {
    fontSize: 14,
    color: Colors.dark.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  tips: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 4,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  completionActions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});