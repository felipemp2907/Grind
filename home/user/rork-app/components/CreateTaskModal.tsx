import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { X, Target, Clock, Flame } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import DateTimePicker from './DateTimePicker';
import { formatDate } from '@/utils/dateUtils';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  goalId?: string;
}

export default function CreateTaskModal({ visible, onClose, date, goalId }: CreateTaskModalProps) {
  const { goals } = useGoalStore();
  const { addTask } = useTaskStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || '');
  const [isHabit, setIsHabit] = useState(false);
  const [xpValue, setXpValue] = useState(30);
  const [scheduledTime, setScheduledTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setTitle('');
      setDescription('');
      setSelectedGoalId(goalId || (goals.length > 0 ? goals[0].id : ''));
      setIsHabit(false);
      setXpValue(30);
      setScheduledTime('');
    }
  }, [visible, goalId, goals]);
  
  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    
    if (!selectedGoalId) {
      Alert.alert('Error', 'Please select a goal for this task');
      return;
    }
    
    // Create new task
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description: description || title,
      date,
      goalId: selectedGoalId,
      completed: false,
      xpValue,
      isHabit,
      streak: 0,
      scheduledTime,
      isUserCreated: true,
      requiresValidation: true
    };
    
    await addTask(newTask);
    
    // Show success message
    Alert.alert(
      'Task Created',
      isHabit 
        ? 'Your streak task has been created. Remember to complete it daily to maintain your streak!'
        : 'Your task has been created successfully.',
      [{ text: 'OK' }]
    );
    
    onClose();
  };
  
  const handleTimeSelect = (time: Date) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    setScheduledTime(formattedTime);
    setShowTimePicker(false);
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create New Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            <Text style={styles.label}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor={Colors.dark.subtext}
              value={title}
              onChangeText={setTitle}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details about this task..."
              placeholderTextColor={Colors.dark.subtext}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <Text style={styles.label}>Goal</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalSelector}
            >
              {goals.map(goal => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalOption,
                    selectedGoalId === goal.id && styles.selectedGoal
                  ]}
                  onPress={() => setSelectedGoalId(goal.id)}
                >
                  <Target size={16} color={selectedGoalId === goal.id ? Colors.dark.text : Colors.dark.primary} />
                  <Text 
                    style={[
                      styles.goalText,
                      selectedGoalId === goal.id && styles.selectedGoalText
                    ]}
                    numberOfLines={1}
                  >
                    {goal.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.timeContainer}>
              <Text style={styles.label}>Scheduled Time (Optional)</Text>
              <TouchableOpacity 
                style={styles.timeSelector}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={16} color={Colors.dark.primary} />
                <Text style={styles.timeText}>
                  {scheduledTime ? scheduledTime : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.switchContainer}>
              <View style={styles.switchLabel}>
                <Flame size={16} color={Colors.dark.warning} />
                <Text style={styles.switchText}>Make this a streak task</Text>
              </View>
              <Switch
                value={isHabit}
                onValueChange={setIsHabit}
                trackColor={{ false: Colors.dark.inactive, true: 'rgba(253, 203, 110, 0.4)' }}
                thumbColor={isHabit ? Colors.dark.warning : Colors.dark.subtext}
              />
            </View>
            
            {isHabit && (
              <View style={styles.habitInfo}>
                <Text style={styles.habitInfoText}>
                  Streak tasks must be completed daily. Missing a day will reset your streak to zero.
                </Text>
              </View>
            )}
            
            <Text style={styles.label}>XP Value</Text>
            <View style={styles.xpSelector}>
              {[10, 20, 30, 50, 100].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.xpOption,
                    xpValue === value && styles.selectedXp
                  ]}
                  onPress={() => setXpValue(value)}
                >
                  <Text 
                    style={[
                      styles.xpText,
                      xpValue === value && styles.selectedXpText
                    ]}
                  >
                    {value} XP
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Button
              title="Create Task"
              onPress={handleCreateTask}
              style={styles.createButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          visible={showTimePicker}
          initialDate={new Date()}
          onClose={() => setShowTimePicker(false)}
          onConfirm={handleTimeSelect}
          mode="time"
          title="Select Task Time"
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    padding: 16,
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
  goalSelector: {
    paddingBottom: 16,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedGoal: {
    backgroundColor: Colors.dark.primary,
  },
  goalText: {
    fontSize: 14,
    color: Colors.dark.primary,
    marginLeft: 4,
    maxWidth: 120,
  },
  selectedGoalText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  timeContainer: {
    marginBottom: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 12,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 8,
  },
  habitInfo: {
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.warning,
  },
  habitInfoText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  xpSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  xpOption: {
    backgroundColor: Colors.dark.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedXp: {
    backgroundColor: Colors.dark.primary,
  },
  xpText: {
    fontSize: 14,
    color: Colors.dark.primary,
  },
  selectedXpText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  createButton: {
    marginTop: 8,
  },
});