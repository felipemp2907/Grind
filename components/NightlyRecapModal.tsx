import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import {
  Moon,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { generateNightlyRecap } from '@/utils/aiUtils';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { useUserStore } from '@/store/userStore';
import * as Haptics from 'expo-haptics';

interface NightlyRecapModalProps {
  visible: boolean;
  onDismiss: () => void;
  onRescheduleTask: (taskTitle: string, newDate: string) => void;
}

export default function NightlyRecapModal({
  visible,
  onDismiss,
  onRescheduleTask
}: NightlyRecapModalProps) {
  const [recap, setRecap] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReschedules, setSelectedReschedules] = useState<string[]>([]);
  
  const { tasks, updateTask } = useTaskStore();
  const { goals } = useGoalStore();
  const { coachSettings } = useUserStore();
  
  const activeGoal = goals.find(g => g.id);
  const currentDate = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.date === currentDate);
  const completedTasks = todayTasks.filter(t => t.completed);
  const incompleteTasks = todayTasks.filter(t => !t.completed);

  useEffect(() => {
    if (visible && !recap) {
      generateRecap();
    }
  }, [visible]);

  const generateRecap = async () => {
    setIsGenerating(true);
    
    try {
      const completedTasksData = completedTasks.map(t => ({
        title: t.title,
        xpValue: t.xpValue
      }));

      const incompleteTasksData = incompleteTasks.map(t => ({
        title: t.title,
        description: t.description
      }));

      const result = await generateNightlyRecap(
        completedTasksData,
        incompleteTasksData,
        activeGoal?.title || 'Your Goals',
        coachSettings.preferredTone
      );

      setRecap(result);

      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error generating nightly recap:', error);
      // Fallback recap
      setRecap({
        recap: `You completed ${completedTasks.length} out of ${todayTasks.length} tasks today. Every step forward counts!`,
        rescheduleSuggestions: incompleteTasks.slice(0, 2).map(task => ({
          taskTitle: task.title,
          suggestedDate: 'tomorrow',
          reason: 'Continue momentum from today'
        })),
        tomorrowFocus: 'Focus on your highest-impact tasks first thing in the morning.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleReschedule = (taskTitle: string) => {
    setSelectedReschedules(prev => 
      prev.includes(taskTitle)
        ? prev.filter(t => t !== taskTitle)
        : [...prev, taskTitle]
    );
  };

  const handleApplyReschedules = () => {
    selectedReschedules.forEach(taskTitle => {
      const suggestion = recap.rescheduleSuggestions.find(
        (s: any) => s.taskTitle === taskTitle
      );
      if (suggestion) {
        const newDate = getDateFromSuggestion(suggestion.suggestedDate);
        onRescheduleTask(taskTitle, newDate);
        
        // Update task in store
        const task = tasks.find(t => t.title === taskTitle && t.date === currentDate);
        if (task) {
          updateTask(task.id, { date: newDate });
        }
      }
    });

    // Provide success haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onDismiss();
  };

  const getDateFromSuggestion = (suggestion: string): string => {
    const today = new Date();
    switch (suggestion) {
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      case 'this-week':
        const thisWeek = new Date(today);
        thisWeek.setDate(today.getDate() + 2);
        return thisWeek.toISOString().split('T')[0];
      case 'next-week':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
      default:
        const defaultDate = new Date(today);
        defaultDate.setDate(today.getDate() + 1);
        return defaultDate.toISOString().split('T')[0];
    }
  };

  const getCompletionRate = () => {
    if (todayTasks.length === 0) return 0;
    return Math.round((completedTasks.length / todayTasks.length) * 100);
  };

  const getTotalXP = () => {
    return completedTasks.reduce((sum, task) => sum + task.xpValue, 0);
  };

  const getPerformanceEmoji = () => {
    const rate = getCompletionRate();
    if (rate >= 90) return '🏆';
    if (rate >= 70) return '🎯';
    if (rate >= 50) return '👍';
    if (rate >= 30) return '💪';
    return '🌱';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Moon size={24} color={Colors.dark.primary} />
              <Text style={styles.title}>Daily Recap</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <X size={20} color={Colors.dark.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
                <Text style={styles.loadingText}>
                  Analyzing your day...
                </Text>
              </View>
            ) : recap ? (
              <>
                {/* Performance Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.performanceEmoji}>{getPerformanceEmoji()}</Text>
                    <Text style={styles.summaryTitle}>Today's Performance</Text>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{getCompletionRate()}%</Text>
                      <Text style={styles.statLabel}>Completion</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{completedTasks.length}</Text>
                      <Text style={styles.statLabel}>Tasks Done</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{getTotalXP()}</Text>
                      <Text style={styles.statLabel}>XP Earned</Text>
                    </View>
                  </View>
                </View>

                {/* AI Recap */}
                <View style={styles.recapCard}>
                  <Text style={styles.recapText}>{recap.recap}</Text>
                </View>

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      ✅ Completed Tasks ({completedTasks.length})
                    </Text>
                    {completedTasks.map((task, index) => (
                      <View key={index} style={styles.taskItem}>
                        <CheckCircle size={16} color={Colors.dark.success} />
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskXP}>+{task.xpValue} XP</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Reschedule Suggestions */}
                {recap.rescheduleSuggestions && recap.rescheduleSuggestions.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      📅 Reschedule Suggestions
                    </Text>
                    <Text style={styles.sectionDescription}>
                      Select tasks to move to a better time:
                    </Text>
                    
                    {recap.rescheduleSuggestions.map((suggestion: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionItem,
                          selectedReschedules.includes(suggestion.taskTitle) && styles.suggestionSelected
                        ]}
                        onPress={() => handleToggleReschedule(suggestion.taskTitle)}
                      >
                        <View style={styles.suggestionContent}>
                          <Text style={styles.suggestionTask}>{suggestion.taskTitle}</Text>
                          <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                          <View style={styles.suggestionMeta}>
                            <Calendar size={12} color={Colors.dark.primary} />
                            <Text style={styles.suggestionDate}>
                              Move to {suggestion.suggestedDate}
                            </Text>
                          </View>
                        </View>
                        <View style={[
                          styles.checkbox,
                          selectedReschedules.includes(suggestion.taskTitle) && styles.checkboxSelected
                        ]}>
                          {selectedReschedules.includes(suggestion.taskTitle) && (
                            <CheckCircle size={16} color={Colors.dark.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Tomorrow's Focus */}
                <View style={styles.focusCard}>
                  <View style={styles.focusHeader}>
                    <TrendingUp size={20} color={Colors.dark.warning} />
                    <Text style={styles.focusTitle}>Tomorrow's Focus</Text>
                  </View>
                  <Text style={styles.focusText}>{recap.tomorrowFocus}</Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          {recap && !isGenerating && (
            <View style={styles.actions}>
              {selectedReschedules.length > 0 ? (
                <Button
                  title={`Reschedule ${selectedReschedules.length} Task${selectedReschedules.length > 1 ? 's' : ''}`}
                  onPress={handleApplyReschedules}
                  icon={<ArrowRight size={16} color={Colors.dark.text} />}
                  style={styles.rescheduleButton}
                />
              ) : (
                <Button
                  title="Good Night! 🌙"
                  onPress={onDismiss}
                  style={styles.goodNightButton}
                />
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginTop: 16,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginTop: 2,
  },
  recapCard: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  recapText: {
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    marginBottom: 4,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
    marginLeft: 8,
  },
  taskXP: {
    fontSize: 12,
    color: Colors.dark.success,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  suggestionSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTask: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionDate: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  focusCard: {
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.warning,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  focusText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  rescheduleButton: {
    backgroundColor: Colors.dark.primary,
  },
  goodNightButton: {
    backgroundColor: Colors.dark.success,
  },
});