import React, { useState, useEffect } from 'react';
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
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Target, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import { useGoalStore } from '@/store/goalStore';
import { formatDate, getDatePlusDays } from '@/utils/dateUtils';
import DateTimePicker from '@/components/DateTimePicker';

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, updateGoal, deleteGoal } = useGoalStore();
  
  const goal = goals.find(g => g.id === id);
  
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [deadline, setDeadline] = useState(goal?.deadline || getDatePlusDays(30));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  useEffect(() => {
    if (!goal) {
      // Goal not found, go back
      router.back();
    }
  }, [goal, router]);
  
  const handleUpdate = () => {
    if (!goal) return;
    
    // Update goal
    updateGoal(goal.id, {
      title,
      description,
      deadline
    });
    
    // Navigate back
    router.back();
  };
  
  const handleDelete = () => {
    if (!goal) return;
    
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteGoal(goal.id);
            router.back();
          }
        }
      ]
    );
  };
  
  const isUpdateDisabled = () => {
    return !title.trim() || !description.trim() || !deadline;
  };

  const handleDateChange = (date: Date) => {
    setDeadline(formatDate(date));
    setShowDatePicker(false);
  };
  
  if (!goal) {
    return null;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "Edit Goal",
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
              <Text style={styles.headerTitle}>Edit Your Goal</Text>
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
              placeholder="Describe your goal in detail..."
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
            
            <Button
              title="Update Goal"
              onPress={handleUpdate}
              disabled={isUpdateDisabled()}
              style={styles.updateButton}
            />
            
            <Button
              title="Delete Goal"
              onPress={handleDelete}
              variant="danger"
              icon={<Trash2 size={16} color={Colors.dark.text} />}
              style={styles.deleteButton}
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
            title="Edit Goal Deadline"
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
  updateButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: Colors.dark.danger,
  },
});