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
  Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Target, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { formatDate, getDatePlusDays } from '@/utils/dateUtils';
import DateTimePicker from '@/components/DateTimePicker';

export default function CreateGoalScreen() {
  const router = useRouter();
  const { goals, createUltimateGoal } = useGoalStore();
  const { fetchTasks } = useTaskStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getDatePlusDays(30)); // Default 30 days

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  
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
    setCurrentStage('Saving goal...');
    
    try {
      console.log('🎯 Creating ultimate goal with batch planner...');
      
      // Update stage messages
      setTimeout(() => setCurrentStage('Planning your days...'), 1000);
      setTimeout(() => setCurrentStage('Seeding tasks...'), 3000);
      
      // Use the goal store's createUltimateGoal method
      await createUltimateGoal({
        title,
        description,
        deadline
      });
      
      console.log('✅ Goal creation completed successfully');
      
      // Refresh tasks to get the newly created tasks
      await fetchTasks();
      
      Alert.alert(
        "Ultimate Goal Created! 🎯",
        `Your goal "${title}" has been created and your full plan is seeded! Check your Home tab to see today's tasks.`,
        [{ text: "View Today", onPress: () => router.replace('/(tabs)/home') }]
      );
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : (() => { try { return JSON.stringify(error); } catch { return String(error); } })();
      console.error('❌ Error creating goal:', errMsg);

      Alert.alert(
        'Goal Creation Failed',
        errMsg || 'There was an issue creating your goal. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setCreating(false);
      setCurrentStage('');
    }
  };
  
  const isCreateDisabled = () => {
    return !title.trim() || !description.trim() || !deadline || creating;
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
            

            
            <View style={styles.aiInfoContainer}>
              <Zap size={20} color={Colors.dark.secondary} />
              <Text style={styles.aiInfoText}>
                After creating your goal, Hustle will generate personalized daily tasks, streak habits, and milestones to help you achieve it!
              </Text>
            </View>
            
            <Button
              title={
                creating && currentStage
                  ? currentStage
                  : creating 
                    ? "Creating Goal & Seeding Plan..." 
                    : "Create Ultimate Goal"
              }
              onPress={handleCreate}
              disabled={isCreateDisabled()}
              loading={creating}
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