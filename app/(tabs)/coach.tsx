import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Brain, 
  Send,
  User,
  RefreshCw,
  Calendar,
  Zap,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { callAI, parseTaskCommand } from '@/utils/aiUtils';
import { AIMessage } from '@/types';
import { getTodayDate, formatDate } from '@/utils/dateUtils';

export default function CoachScreen() {
  const { goals, activeGoalId } = useGoalStore();
  const { tasks, getTasks, updateTask, addTask, rescheduleTask } = useTaskStore();
  const { profile, coachSettings } = useUserStore();
  
  const [messages, setMessages] = useState<{
    role: 'user' | 'assistant';
    content: string;
    commandResult?: any;
  }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingCommand, setProcessingCommand] = useState(false);
  
  const goal = goals.find(g => g.id === activeGoalId) || goals[0];
  
  // Get recent tasks for context
  const todayTasks = getTasks(getTodayDate());
  
  useEffect(() => {
    // Generate initial greeting
    generateInitialGreeting();
  }, []);
  
  const generateInitialGreeting = async () => {
    if (messages.length > 0 || !goal) return;
    
    setLoading(true);
    
    try {
      const systemMessage: AIMessage = {
        role: 'system',
        content: `You are Alvo, an advanced AI coach for the Grind app. Your role is to help users achieve their goals through daily accountability, guidance, and intelligent task management.
        
        The user's goal is: ${goal?.title}
        Goal description: ${goal?.description}
        Deadline: ${goal?.deadline}
        Current streak: ${profile.streakDays} days
        Preferred tone: ${coachSettings.preferredTone}
        
        You have advanced capabilities:
        1. Create, update, and reschedule tasks through natural language
        2. Provide personalized coaching based on user's tone preference
        3. Analyze progress and suggest optimizations
        4. Help with time management and prioritization
        
        When users ask you to schedule or manage tasks, confirm what you've done and provide helpful context.
        
        Tone guidelines:
        - Cheerful: Be enthusiastic, encouraging, and use positive language
        - Data-driven: Focus on metrics, progress tracking, and logical reasoning  
        - Tough-love: Be direct, challenging, and push for accountability
        
        Be motivational, insightful, and action-oriented. Keep responses concise (2-3 paragraphs max).
        Focus on helping the user make daily progress toward their goal.
        
        Examples of what you can help with:
        - "Schedule gym workout tomorrow at 7 AM"
        - "Add daily meditation as a habit"
        - "Move my meeting to Friday"
        - "Create a task to research competitors"
        - "Set up a 30-minute study session for tonight"`
      };
      
      const userMessage: AIMessage = {
        role: 'user',
        content: 'Hello Alvo, I just opened the coach tab. Give me a brief greeting and overview of how you can help me today.'
      };
      
      const response = await callAI([systemMessage, userMessage]);
      
      setMessages([
        {
          role: 'assistant',
          content: response
        }
      ]);
    } catch (error) {
      console.error('Error generating greeting:', error);
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm Alvo, your advanced personal coach. I can help you create and manage tasks, provide personalized guidance, and keep you on track toward your goals. Try saying something like 'Schedule workout tomorrow at 8 AM' or 'Add daily reading as a habit'. How can I help you make progress today?"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = {
      role: 'user' as const,
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);
    
    try {
      // First, check if this is a task command
      setProcessingCommand(true);
      const commandResult = await parseTaskCommand(currentInput, getTodayDate());
      setProcessingCommand(false);
      
      let aiResponse = '';
      let commandExecuted = false;
      
      // Execute the command if it's a valid action
      if (commandResult.action !== 'none') {
        commandExecuted = true;
        
        switch (commandResult.action) {
          case 'create':
            if (commandResult.taskData && goal) {
              const newTask = {
                id: `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: commandResult.taskData.title,
                description: commandResult.taskData.description || commandResult.taskData.title,
                date: commandResult.taskData.date,
                goalId: goal.id,
                completed: false,
                xpValue: commandResult.taskData.xpValue || 30,
                isHabit: commandResult.taskData.isHabit || false,
                streak: 0,
                scheduledTime: commandResult.taskData.time,
                isUserCreated: true,
                requiresValidation: true
              };
              
              addTask(newTask);
              aiResponse = commandResult.confirmation + ` I've added "${commandResult.taskData.title}" to your ${commandResult.taskData.isHabit ? 'daily habits' : 'tasks'}.`;
            }
            break;
            
          case 'reschedule':
            if (commandResult.updateData) {
              // Find task by title (simple matching)
              const taskToReschedule = tasks.find(task => 
                task.title.toLowerCase().includes(currentInput.toLowerCase().split(' ').find(word => 
                  task.title.toLowerCase().includes(word.toLowerCase())
                ) || '')
              );
              
              if (taskToReschedule && commandResult.updateData.newDate) {
                rescheduleTask(
                  taskToReschedule.id, 
                  commandResult.updateData.newDate,
                  commandResult.updateData.newTime
                );
                aiResponse = commandResult.confirmation + ` I've moved "${taskToReschedule.title}" to ${commandResult.updateData.newDate}.`;
              } else {
                aiResponse = "I couldn't find that task to reschedule. Could you be more specific about which task you'd like to move?";
              }
            }
            break;
            
          default:
            aiResponse = commandResult.confirmation;
        }
      }
      
      // If no command was executed, proceed with normal AI conversation
      if (!commandExecuted) {
        const aiMessages: AIMessage[] = [
          {
            role: 'system',
            content: `You are Alvo, an advanced AI coach for the Grind app. Your role is to help users achieve their goals through daily accountability, guidance, and intelligent task management.
            
            The user's goal is: ${goal?.title}
            Goal description: ${goal?.description}
            Deadline: ${goal?.deadline}
            Current streak: ${profile.streakDays} days
            Preferred tone: ${coachSettings.preferredTone}
            
            Today's tasks: ${todayTasks.map(t => `${t.title} (${t.completed ? 'Completed' : 'Not completed'})`).join(', ')}
            
            You can help users by:
            - Creating tasks with natural language (e.g., "Schedule workout tomorrow at 8 AM")
            - Adding daily habits (e.g., "Add daily meditation")
            - Rescheduling tasks (e.g., "Move my meeting to Friday")
            - Providing coaching and motivation
            
            Tone guidelines:
            - Cheerful: Be enthusiastic, encouraging, and use positive language
            - Data-driven: Focus on metrics, progress tracking, and logical reasoning  
            - Tough-love: Be direct, challenging, and push for accountability
            
            Be motivational, insightful, and action-oriented. Keep responses concise (2-3 paragraphs max).
            Focus on helping the user make daily progress toward their goal.`
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: currentInput
          }
        ];
        
        aiResponse = await callAI(aiMessages);
      }
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse,
          commandResult: commandExecuted ? commandResult : undefined
        }
      ]);
      
    } catch (error) {
      console.error('Error calling AI:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment."
        }
      ]);
    } finally {
      setLoading(false);
      setProcessingCommand(false);
    }
  };
  
  const renderMessage = (message: { role: 'user' | 'assistant'; content: string; commandResult?: any }, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <View 
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer
        ]}
      >
        <View style={styles.messageIconContainer}>
          {isUser ? (
            <User size={16} color={Colors.dark.text} />
          ) : (
            <Brain size={16} color={Colors.dark.secondary} />
          )}
        </View>
        <View 
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.aiMessageBubble
          ]}
        >
          <Text style={styles.messageText}>{message.content}</Text>
          
          {message.commandResult && message.commandResult.action !== 'none' && (
            <View style={styles.commandResultContainer}>
              <View style={styles.commandResultHeader}>
                <Zap size={14} color={Colors.dark.success} />
                <Text style={styles.commandResultTitle}>Task Created</Text>
              </View>
              <Text style={styles.commandResultText}>
                Action: {message.commandResult.action}
              </Text>
              {message.commandResult.taskData && (
                <>
                  <Text style={styles.commandResultText}>
                    Task: {message.commandResult.taskData.title}
                  </Text>
                  <Text style={styles.commandResultText}>
                    Date: {message.commandResult.taskData.date}
                  </Text>
                  {message.commandResult.taskData.time && (
                    <Text style={styles.commandResultText}>
                      Time: {message.commandResult.taskData.time}
                    </Text>
                  )}
                  {message.commandResult.taskData.isHabit && (
                    <Text style={styles.commandResultText}>
                      Type: Daily Habit
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };
  
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Quick Actions:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setInput('Schedule workout tomorrow at 8 AM')}
        >
          <Plus size={16} color={Colors.dark.primary} />
          <Text style={styles.quickActionText}>Add Workout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setInput('Add daily meditation as a habit')}
        >
          <CheckCircle size={16} color={Colors.dark.primary} />
          <Text style={styles.quickActionText}>Daily Habit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setInput('Create a 30-minute study session for tonight')}
        >
          <Clock size={16} color={Colors.dark.primary} />
          <Text style={styles.quickActionText}>Study Session</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setInput('How am I doing with my goal?')}
        >
          <Brain size={16} color={Colors.dark.primary} />
          <Text style={styles.quickActionText}>Progress Check</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Brain size={24} color={Colors.dark.secondary} />
            <Text style={styles.headerTitle}>Alvo Coach</Text>
          </View>
          <View style={styles.headerInfo}>
            <Calendar size={16} color={Colors.dark.subtext} />
            <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
          </View>
        </View>
        
        {messages.length === 0 && !loading && renderQuickActions()}
        
        <ScrollView 
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}
          
          {(loading || processingCommand) && messages.length > 0 && (
            <View style={styles.loadingContainer}>
              <RefreshCw size={20} color={Colors.dark.primary} />
              <Text style={styles.loadingText}>
                {processingCommand ? 'Processing command...' : 'Alvo is thinking...'}
              </Text>
            </View>
          )}
          
          {loading && messages.length === 0 && (
            <View style={styles.initialLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.dark.primary} />
              <Text style={styles.initialLoadingText}>Alvo is getting ready...</Text>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Alvo for advice or say 'Schedule workout tomorrow at 8 AM'..."
            placeholderTextColor={Colors.dark.subtext}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.disabledSendButton
            ]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send size={20} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDate: {
    fontSize: 12,
    color: Colors.dark.subtext,
    marginLeft: 4,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  quickActionsScroll: {
    flexDirection: 'row',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '20',
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '90%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '85%',
  },
  userMessageBubble: {
    backgroundColor: Colors.dark.primary,
  },
  aiMessageBubble: {
    backgroundColor: Colors.dark.card,
  },
  messageText: {
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  commandResultContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.success,
  },
  commandResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commandResultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.success,
    marginLeft: 4,
  },
  commandResultText: {
    fontSize: 12,
    color: Colors.dark.text,
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.primary,
    marginLeft: 8,
  },
  initialLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  initialLoadingText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.separator,
    backgroundColor: Colors.dark.card,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.dark.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.dark.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: Colors.dark.inactive,
  },
});