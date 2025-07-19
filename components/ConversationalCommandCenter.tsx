import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import {
  Send,
  Mic,
  MicOff,
  CheckCircle,
  Calendar,
  Clock,
  Zap,
  AlertCircle
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { parseTaskCommand } from '@/utils/aiUtils';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import * as Haptics from 'expo-haptics';

interface ConversationalCommandCenterProps {
  onTaskCreated?: (task: any) => void;
  onEventCreated?: (event: any) => void;
}

export default function ConversationalCommandCenter({
  onTaskCreated,
  onEventCreated
}: ConversationalCommandCenterProps) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCommand, setLastCommand] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { tasks, addTask } = useTaskStore();
  const { goals } = useGoalStore();
  const activeGoal = goals.find(g => g.id); // Get first goal as active

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTasks = tasks.map(t => ({
        title: t.title,
        date: t.date,
        isHabit: t.isHabit
      }));

      const result = await parseTaskCommand(message, currentDate);

      setLastCommand(result);
      
      if (result.action !== 'none') {
        setShowConfirmation(true);
      }

      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          result.action !== 'none' 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch (error) {
      console.error('Error processing command:', error);
      setLastCommand({
        action: 'none',
        confirmation: 'Sorry, I had trouble understanding that. Please try again.'
      });
      setShowConfirmation(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!lastCommand) return;

    try {
      if (lastCommand.action === 'create' && lastCommand.taskData) {
        const newTask = {
          id: `task-${Date.now()}`,
          title: lastCommand.taskData.title,
          description: lastCommand.taskData.description,
          date: lastCommand.taskData.date,
          goalId: activeGoal?.id || '',
          completed: false,
          xpValue: lastCommand.taskData.xpValue,
          isHabit: lastCommand.taskData.isHabit,
          streak: 0,
          scheduledTime: lastCommand.taskData.time,
          isUserCreated: true,
          requiresValidation: true,
          priority: 'medium' as const,
          estimatedTime: '30 min'
        };

        addTask(newTask);
        onTaskCreated?.(newTask);

        // Provide success haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (lastCommand.action === 'reschedule' && lastCommand.updateData) {
        // Handle task rescheduling
        console.log('Reschedule action:', lastCommand.updateData);
      }

      setMessage('');
      setShowConfirmation(false);
      setLastCommand(null);
    } catch (error) {
      console.error('Error confirming action:', error);
    }
  };

  const handleCancelAction = () => {
    setShowConfirmation(false);
    setLastCommand(null);
    setMessage('');
  };

  const getActionIcon = () => {
    if (!lastCommand) return null;
    
    switch (lastCommand.action) {
      case 'create':
        return <CheckCircle size={20} color={Colors.dark.success} />;
      case 'update':
        return <Clock size={20} color={Colors.dark.warning} />;
      case 'reschedule':
        return <Clock size={20} color={Colors.dark.warning} />;
      default:
        return <AlertCircle size={20} color={Colors.dark.subtext} />;
    }
  };

  const getActionColor = () => {
    if (!lastCommand) return Colors.dark.card;
    
    switch (lastCommand.action) {
      case 'create':
        return 'rgba(0, 184, 148, 0.1)';
      case 'update':
      case 'reschedule':
        return 'rgba(253, 203, 110, 0.1)';
      default:
        return 'rgba(255, 118, 117, 0.1)';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Hustle Command Center</Text>
        <Text style={styles.subtitle}>
          Tell me what you want to do and I'll help you create tasks or events
        </Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {showConfirmation && lastCommand && (
          <View style={[styles.confirmationCard, { backgroundColor: getActionColor() }]}>
            <View style={styles.confirmationHeader}>
              {getActionIcon()}
              <Text style={styles.confirmationTitle}>
                Confirm Action
              </Text>
            </View>
            
            <Text style={styles.confirmationText}>
              {lastCommand.confirmation}
            </Text>

            {lastCommand.taskData && (
              <View style={styles.taskPreview}>
                <Text style={styles.taskPreviewTitle}>{lastCommand.taskData.title}</Text>
                <Text style={styles.taskPreviewDescription}>{lastCommand.taskData.description}</Text>
                <View style={styles.taskPreviewMeta}>
                  <Text style={styles.taskPreviewMetaText}>
                    📅 {lastCommand.taskData.date}
                  </Text>
                  {lastCommand.taskData.time && (
                    <Text style={styles.taskPreviewMetaText}>
                      🕐 {lastCommand.taskData.time}
                    </Text>
                  )}
                  <Text style={styles.taskPreviewMetaText}>
                    ⚡ {lastCommand.taskData.xpValue} XP
                  </Text>
                  {lastCommand.taskData.isHabit && (
                    <Text style={styles.taskPreviewMetaText}>🔥 Habit</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.confirmationActions}>
              <Button
                title="Confirm"
                onPress={handleConfirmAction}
                style={styles.confirmButton}
              />
              <Button
                title="Cancel"
                onPress={handleCancelAction}
                variant="outline"
                style={styles.cancelButton}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Add workout tomorrow at 8 AM..."
            placeholderTextColor={Colors.dark.subtext}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!isProcessing}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, { opacity: message.trim() && !isProcessing ? 1 : 0.5 }]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.dark.text} />
            ) : (
              <Send size={20} color={Colors.dark.text} />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Try saying:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setMessage('Add 30-minute workout tomorrow at 7 AM')}
            >
              <Text style={styles.suggestionText}>Add workout tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setMessage('Schedule meeting with team on Friday at 2 PM')}
            >
              <Text style={styles.suggestionText}>Schedule meeting Friday</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setMessage('Add daily meditation as a habit')}
            >
              <Text style={styles.suggestionText}>Add daily habit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.subtext,
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  confirmationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  taskPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  taskPreviewDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 8,
  },
  taskPreviewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskPreviewMetaText: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: Colors.dark.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginBottom: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
});