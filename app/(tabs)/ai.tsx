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
  Platform,
  Alert
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Brain, 
  Send,
  User,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { callAI, parseTaskCommand } from '@/utils/aiUtils';
import { AIMessage } from '@/types';
import { getTodayDate, formatDate } from '@/utils/dateUtils';

export default function AIScreen() {
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
        content: `You are Hustle, an advanced AI coach for the Grind app. Your role is to help users achieve their goals through daily accountability, guidance, and intelligent task management.
        
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
        Focus on helping the user make daily progress toward their goal.`
      };
      
      const userMessage: AIMessage = {
        role: 'user',
        content: 'Hello Hustle, I just opened the AI coach tab. Give me a brief greeting and overview of how you can help me today.'
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
          content: "Hello! I'm Hustle, your relentless personal coach. I can help you create and manage tasks, provide personalized guidance, and keep you on track toward your goals. How can I help you make progress today?"
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
              aiResponse = commandResult.confirmation;
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
                aiResponse = commandResult.confirmation;
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
            content: `You are Hustle, an advanced AI coach for the Grind app. Your role is to help users achieve their goals through daily accountability, guidance, and intelligent task management.
            
            The user's goal is: ${goal?.title}
            Goal description: ${goal?.description}
            Deadline: ${goal?.deadline}
            Current streak: ${profile.streakDays} days
            Preferred tone: ${coachSettings.preferredTone}
            
            Recent tasks: ${todayTasks.map(t => `${t.title} (${t.completed ? 'Completed' : 'Not completed'})`).join(', ')}
            
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
                <Text style={styles.commandResultTitle}>Command Executed</Text>
              </View>
              <Text style={styles.commandResultText}>
                Action: {message.commandResult.action}
              </Text>
              {message.commandResult.taskData && (
                <Text style={styles.commandResultText}>
                  Task: {message.commandResult.taskData.title}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "AI Coach",
          headerShown: false,
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Brain size={24} color={Colors.dark.secondary} />
              <Text style={styles.headerTitle}>Hustle Coach</Text>
            </View>
            <View style={styles.headerInfo}>
              <Calendar size={16} color={Colors.dark.subtext} />
              <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(renderMessage)}
            
            {(loading || processingCommand) && messages.length > 0 && (
              <View style={styles.loadingContainer}>
                <RefreshCw size={20} color={Colors.dark.primary} />
                <Text style={styles.loadingText}>
                  {processingCommand ? 'Processing command...' : 'Hustle is thinking...'}
                </Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask Hustle for advice, say 'Schedule workout tomorrow at 8 AM', or 'Generate AI task suggestions'..."
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
      </SafeAreaView>
    </>
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