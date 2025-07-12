import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import {
  Calendar,
  CheckCircle,
  RefreshCw,
  Clock,
  Zap,
  Target,
  X
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { generateProactiveDailyAgenda } from '@/utils/aiUtils';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { useUserStore } from '@/store/userStore';
import * as Haptics from 'expo-haptics';

interface ProactiveAgendaBuilderProps {
  visible: boolean;
  onDismiss: () => void;
  onAcceptAgenda: (tasks: any[]) => void;
}

export default function ProactiveAgendaBuilder({
  visible,
  onDismiss,
  onAcceptAgenda
}: ProactiveAgendaBuilderProps) {
  const [agenda, setAgenda] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  
  const { tasks, addTask } = useTaskStore();
  const { goals } = useGoalStore();
  const { profile, coachSettings } = useUserStore();
  
  const activeGoal = goals.find(g => g.id); // Get first goal as active
  const currentDate = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.date === currentDate);

  useEffect(() => {
    if (visible && !agenda) {
      generateAgenda();
    }
  }, [visible]);

  const generateAgenda = async () => {
    if (!activeGoal) return;

    setIsGenerating(true);
    
    try {
      const recentTasks = tasks
        .filter(t => t.completed)
        .slice(-10)
        .map(t => t.title);

      const existingTasks = todayTasks.map(t => ({
        title: t.title,
        type: t.isHabit ? 'streak' : 'today'
      }));

      const result = await generateProactiveDailyAgenda(
        activeGoal.title,
        activeGoal.description,
        recentTasks,
        currentDate,
        coachSettings.preferredTone,
        existingTasks
      );

      setAgenda(result);

      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error generating agenda:', error);
      // Fallback agenda
      setAgenda({
        agenda: [
          {
            title: `Work on ${activeGoal.title}`,
            description: 'Make meaningful progress on your goal',
            xpValue: 40,
            priority: 'high',
            estimatedTime: '45 min',
            type: 'today',
            loadScore: 3,
            proofMode: 'flex'
          }
        ],
        motivation: "Let's make today count! Every small step brings you closer to your goal.",
        focusArea: "Focus on your highest-impact tasks first thing in the morning."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAgenda = async () => {
    if (!agenda || !activeGoal) return;

    setIsAccepting(true);

    try {
      const newTasks = agenda.agenda.map((agendaTask: any) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        title: agendaTask.title,
        description: agendaTask.description,
        date: currentDate,
        goalId: activeGoal.id,
        completed: false,
        xpValue: agendaTask.xpValue,
        isHabit: agendaTask.type === 'streak',
        streak: 0,
        isUserCreated: false,
        requiresValidation: agendaTask.proofMode === 'realtime',
        priority: agendaTask.priority,
        estimatedTime: agendaTask.estimatedTime
      }));

      // Add tasks to store
      newTasks.forEach(task => addTask(task));
      
      // Call parent callback
      onAcceptAgenda(newTasks);

      // Provide success haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onDismiss();
    } catch (error) {
      console.error('Error accepting agenda:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRegenerateAgenda = () => {
    setAgenda(null);
    generateAgenda();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return Colors.dark.danger;
      case 'medium':
        return Colors.dark.warning;
      case 'low':
        return Colors.dark.success;
      default:
        return Colors.dark.subtext;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⚡';
      case 'low':
        return '💡';
      default:
        return '📝';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Calendar size={24} color={Colors.dark.primary} />
            <Text style={styles.title}>Your Daily Agenda</Text>
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
                Crafting your perfect day...
              </Text>
            </View>
          ) : agenda ? (
            <>
              <View style={styles.motivationCard}>
                <Text style={styles.motivationText}>{agenda.motivation}</Text>
                <Text style={styles.focusText}>
                  🎯 Today's Focus: {agenda.focusArea}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Recommended Tasks ({agenda.agenda.length})
              </Text>

              {agenda.agenda.map((task: any, index: number) => (
                <View key={index} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskPriorityIcon}>
                        {getPriorityIcon(task.priority)}
                      </Text>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}20` }]}>
                        <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                          {task.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.taskDescription}>{task.description}</Text>

                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={14} color={Colors.dark.subtext} />
                      <Text style={styles.metaText}>{task.estimatedTime}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Zap size={14} color={Colors.dark.warning} />
                      <Text style={styles.metaText}>{task.xpValue} XP</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Target size={14} color={Colors.dark.primary} />
                      <Text style={styles.metaText}>
                        {task.type === 'streak' ? 'Habit' : 'Today'}
                      </Text>
                    </View>
                    {task.proofMode === 'realtime' && (
                      <View style={styles.metaItem}>
                        <Text style={styles.realtimeText}>📷 Camera Only</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Today's Load</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {agenda.agenda.reduce((sum: number, task: any) => sum + task.loadScore, 0)}/5
                    </Text>
                    <Text style={styles.statLabel}>Load Score</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {agenda.agenda.reduce((sum: number, task: any) => sum + task.xpValue, 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total XP</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {agenda.agenda.filter((task: any) => task.type === 'streak').length}
                    </Text>
                    <Text style={styles.statLabel}>Habits</Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        {agenda && !isGenerating && (
          <View style={styles.actions}>
            <Button
              title="Accept Agenda"
              onPress={handleAcceptAgenda}
              loading={isAccepting}
              disabled={isAccepting}
              icon={<CheckCircle size={16} color={Colors.dark.text} />}
              style={styles.acceptButton}
            />
            <Button
              title="Regenerate"
              onPress={handleRegenerateAgenda}
              variant="outline"
              icon={<RefreshCw size={16} color={Colors.dark.primary} />}
              style={styles.regenerateButton}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
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
  motivationCard: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  motivationText: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  focusText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  taskHeader: {
    marginBottom: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskPriorityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  realtimeText: {
    fontSize: 12,
    color: Colors.dark.warning,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.success,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  acceptButton: {
    flex: 2,
  },
  regenerateButton: {
    flex: 1,
  },
});