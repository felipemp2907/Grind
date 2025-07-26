import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Target, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { formatDate, getDatePlusDays, getTodayDate } from '@/utils/dateUtils';
import { generateGoalBreakdown } from '@/utils/aiUtils';
import DateTimePicker from '@/components/DateTimePicker';

export default function CreateGoalScreen() {
  const router = useRouter();
  const { goals, addGoal } = useGoalStore();
  const { addTask } = useTaskStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getDatePlusDays(30)); // Default 30 days

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingBreakdown, setGeneratingBreakdown] = useState(false);
  
  const handleCreate = async () => {
    // Check if we already have 3 goals
    if (goals.length >= 3) {
      Alert.alert(
        "Goal Limit Reached",
        "You can only have up to 3 goals at a time. Please delete an existing goal first.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setCreating(true);
    
    try {
      // Create new goal with enhanced structure
      const newGoal = {
        id: Date.now().toString(),
        title,
        description,
        deadline,
        category: 'personal',
        milestones: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Enhanced Grind fields
        progressValue: 0,
        targetValue: 100, // Default to 100 for percentage-based progress
        xpEarned: 0,
        streakCount: 0,
        todayTasksIds: [],
        streakTaskIds: [],
        status: 'active' as const,
        priority: 'high' as const
      };
      
      // Add goal
      addGoal(newGoal);
      
      // Generate AI breakdown
      if (title && description) {
        setGeneratingBreakdown(true);
        
        try {
          const breakdown = await generateGoalBreakdown(
            title,
            description,
            deadline,
            100, // Use 100 as default target for percentage-based progress
            'progress',
            0
          );
          
          // Create tasks from breakdown
          const todayDate = getTodayDate();
          
          // Add today tasks (limit to 3)
          breakdown.todayTasks.slice(0, 3).forEach((task, index) => {
            const newTask = {
              title: task.title,
              description: task.description,
              date: todayDate,
              goalId: newGoal.id,
              completed: false,
              xpValue: task.xpValue,
              isHabit: false,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true,
              priority: task.priority,
              estimatedTime: task.estimatedTime,
              proofRequired: true,
              proofSubmitted: false,
              proofValidated: false,
              taskType: 'today' as const
            };
            
            addTask(newTask);
          });
          
          // Add streak habits (limit to 3)
          breakdown.streakHabits.slice(0, 3).forEach((habit, index) => {
            const newTask = {
              title: habit.title,
              description: habit.description,
              date: todayDate,
              goalId: newGoal.id,
              completed: false,
              xpValue: habit.xpValue,
              isHabit: true,
              streak: 0,
              isUserCreated: false,
              requiresValidation: true,
              priority: 'medium' as const,
              estimatedTime: '15 min',
              proofRequired: true,
              proofSubmitted: false,
              proofValidated: false,
              taskType: 'streak' as const
            };
            
            addTask(newTask);
          });
          
          Alert.alert(
            "Goal Created! 🎯",
            `Your goal "${title}" has been created and Hustle has generated ${Math.min(breakdown.todayTasks.length, 3)} tasks and ${Math.min(breakdown.streakHabits.length, 3)} daily habits to get you started!`,
            [{ text: "Let's Go!" }]
          );
          
        } catch (error) {
          console.error('Error generating breakdown:', error);
          Alert.alert(
            "Goal Created",
            "Your goal has been created! You can ask Hustle to generate tasks for you in the coach tab.",
            [{ text: "OK" }]
          );
        } finally {
          setGeneratingBreakdown(false);
        }
      }
      
      // Navigate back
      router.back();
      
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert(
        "Error",
        "There was an issue creating your goal. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setCreating(false);
    }
  };
  
  const isCreateDisabled = () => {
    return !title.trim() || !description.trim() || !deadline || creating || generatingBreakdown;
  };

  const handleDateChange = (date: Date) => {
    setDeadline(formatDate(date));
    setShowDatePicker(false);
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "Create Ultimate Goal",
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Target size={32} color={Colors.dark.primary} />
              <Text style={styles.headerTitle}>Set Your Ultimate Goal</Text>
              <Text style={styles.headerSubtitle}>
                Define a clear, ambitious goal with a specific deadline and target
              </Text>
            </View>
            
            <Text style={styles.label}>Goal Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you want to achieve?"
              placeholderTextColor={Colors.dark.subtext}
              value={title}
              onChangeText={setTitle}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your goal in detail. Be specific about what you want to achieve and why it matters to you."
              placeholderTextColor={Colors.dark.subtext}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            

            
            <Text style={styles.label}>Deadline</Text>
            <View style={styles.datePickerContainer}>
              <Calendar size={24} color={Colors.dark.primary} />
              <TouchableOpacity 
                style={styles.datePicker}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(new Date(deadline))}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.presetDates}>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => setDeadline(getDatePlusDays(7))}
              >
                <Text style={styles.presetText}>1 Week</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => setDeadline(getDatePlusDays(30))}
              >
                <Text style={styles.presetText}>1 Month</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.presetText}>Custom</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.warningContainer}>
              <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
              <Text style={styles.warningText}>
                Ultimate goals cannot be deleted once created. Please seriously commit to this goal and describe it in as much detail as possible. This will be your main focus for the duration you set.
              </Text>
            </View>
            
            <View style={styles.aiInfoContainer}>
              <Zap size={20} color={Colors.dark.secondary} />
              <Text style={styles.aiInfoText}>
                After creating your goal, Hustle will generate personalized daily tasks, streak habits, and milestones to help you achieve it!
              </Text>
            </View>
            
            <Button
              title={
                creating 
                  ? "Creating Goal..." 
                  : generatingBreakdown 
                    ? "Generating AI Breakdown..." 
                    : "Create Ultimate Goal"
              }
              onPress={handleCreate}
              disabled={isCreateDisabled()}
              loading={creating || generatingBreakdown}
              style={styles.createButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            visible={showDatePicker}
            initialDate={new Date(deadline)}
            onClose={() => setShowDatePicker(false)}
            onConfirm={handleDateChange}
            mode="date"
            minimumDate={new Date()}
            title="Select Goal Deadline"
          />
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },

  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  datePicker: {
    flex: 1,
    marginLeft: 12,
  },
  dateText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  presetDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: '30%',
    marginHorizontal: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.danger,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.danger,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  aiInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 206, 201, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  aiInfoText: {
    fontSize: 14,
    color: Colors.dark.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  createButton: {
    marginTop: 8,
  },
});