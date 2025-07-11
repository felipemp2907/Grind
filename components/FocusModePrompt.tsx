import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { 
  Focus, 
  Clock, 
  X, 
  Play,
  Pause,
  CheckCircle
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import * as Haptics from 'expo-haptics';

interface FocusModePromptProps {
  visible: boolean;
  onDismiss: () => void;
  onStartFocus: () => void;
  blurCount: number;
}

export default function FocusModePrompt({ 
  visible, 
  onDismiss, 
  onStartFocus,
  blurCount 
}: FocusModePromptProps) {
  const [focusActive, setFocusActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  
  const startFocusSession = () => {
    setFocusActive(true);
    onStartFocus();
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Start countdown timer
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeFocusSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(interval as ReturnType<typeof setInterval>);
  };
  
  const pauseFocusSession = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setFocusActive(false);
  };
  
  const resumeFocusSession = () => {
    setFocusActive(true);
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeFocusSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(interval as ReturnType<typeof setInterval>);
  };
  
  const completeFocusSession = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    
    setFocusActive(false);
    setTimeRemaining(20 * 60);
    
    // Provide completion haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Show completion message briefly before dismissing
    setTimeout(() => {
      onDismiss();
    }, 2000);
  };
  
  const handleDismiss = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setFocusActive(false);
    setTimeRemaining(20 * 60);
    onDismiss();
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getMotivationMessage = () => {
    if (timeRemaining === 0) {
      return "🎉 Focus session complete! Great job staying focused!";
    }
    
    if (blurCount >= 10) {
      return "You've been distracted quite a bit. A focus session could really help you get back on track.";
    } else if (blurCount >= 7) {
      return "I noticed you've been switching between apps frequently. How about a 20-minute focus session?";
    } else {
      return "Ready to eliminate distractions and boost your productivity?";
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Focus size={24} color={Colors.dark.primary} />
              <Text style={styles.title}>
                {timeRemaining === 0 ? 'Session Complete!' : 'Focus Mode'}
              </Text>
            </View>
            {!focusActive && timeRemaining > 0 && (
              <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <X size={20} color={Colors.dark.subtext} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.message}>
            {getMotivationMessage()}
          </Text>
          
          {blurCount > 0 && timeRemaining > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                Detected {blurCount} distractions in the last 10 minutes
              </Text>
            </View>
          )}
          
          {timeRemaining > 0 ? (
            <>
              <View style={styles.timerContainer}>
                <Clock size={32} color={focusActive ? Colors.dark.success : Colors.dark.primary} />
                <Text style={[
                  styles.timerText,
                  { color: focusActive ? Colors.dark.success : Colors.dark.primary }
                ]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>
              
              <View style={styles.actions}>
                {!focusActive ? (
                  <Button
                    title="Start 20-Min Focus"
                    onPress={startFocusSession}
                    icon={<Play size={16} color={Colors.dark.text} />}
                    style={styles.actionButton}
                  />
                ) : (
                  <View style={styles.focusActions}>
                    <Button
                      title="Pause"
                      onPress={pauseFocusSession}
                      variant="outline"
                      icon={<Pause size={16} color={Colors.dark.primary} />}
                      style={styles.focusActionButton}
                    />
                    <Button
                      title="End Session"
                      onPress={completeFocusSession}
                      variant="danger"
                      style={styles.focusActionButton}
                    />
                  </View>
                )}
                
                {!focusActive && (
                  <Button
                    title="Maybe Later"
                    onPress={handleDismiss}
                    variant="outline"
                    style={styles.actionButton}
                  />
                )}
              </View>
              
              {focusActive && (
                <View style={styles.focusIndicator}>
                  <Text style={styles.focusIndicatorText}>
                    🎯 Focus mode active - Stay on track!
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.completionContainer}>
              <CheckCircle size={48} color={Colors.dark.success} />
              <Text style={styles.completionText}>
                You completed a 20-minute focus session!
              </Text>
              <Text style={styles.completionSubtext}>
                +50 XP bonus for staying focused
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.warning,
  },
  statsText: {
    fontSize: 14,
    color: Colors.dark.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  focusActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  focusActionButton: {
    flex: 1,
  },
  focusIndicator: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.success,
  },
  focusIndicatorText: {
    fontSize: 14,
    color: Colors.dark.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  completionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completionSubtext: {
    fontSize: 14,
    color: Colors.dark.success,
    fontWeight: '600',
  },
});