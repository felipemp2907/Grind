import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Calendar, Target, Brain } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';
import { useGoalStore } from '@/store/goalStore';
import { useUserStore } from '@/store/userStore';
import { useTaskStore } from '@/store/taskStore';
import { useAuthStore } from '@/store/authStore';
import { formatDate, getDatePlusDays, getTodayDate } from '@/utils/dateUtils';
import DateTimePicker from '@/components/DateTimePicker';

export default function OnboardingScreen() {
  const router = useRouter();
  const { addGoal, setOnboarded } = useGoalStore();
  const { updateProfile } = useUserStore();
  const { generateTasksForGoal, isGenerating } = useTaskStore();
  const { user, logout } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [deadline, setDeadline] = useState(getDatePlusDays(30)); // Default 30 days
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const completeOnboarding = async () => {
    setIsCompleting(true);
    
    try {
      // Update user profile with name from auth
      if (user) {
        updateProfile({ name: user.name });
      }
      
      // Create goal
      const newGoal = {
        id: Date.now().toString(),
        title: goalTitle,
        description: goalDescription,
        deadline,
        milestones: [],
        createdAt: new Date().toISOString()
      };
      
      addGoal(newGoal);
      
      // Generate tasks for the goal
      await generateTasksForGoal(getTodayDate(), newGoal.id);
      
      // Mark as onboarded
      setOnboarded(true);
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error during onboarding completion:', error);
      
      // Still mark as onboarded and navigate to main app
      setOnboarded(true);
      router.replace('/(tabs)');
      
      // Show error message after navigation
      setTimeout(() => {
        Alert.alert(
          "Welcome to DailyDeck!",
          "Your goal has been created, but there was an issue generating tasks. You can manually generate them from the Tasks tab.",
          [{ text: "OK" }]
        );
      }, 500);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDateChange = (date: Date) => {
    setDeadline(formatDate(date));
    setShowDatePicker(false);
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set Your Ultimate Goal</Text>
            <Text style={styles.stepDescription}>
              What's the big goal you want to achieve? Be specific and ambitious.
              You can add more goals later.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Goal title (e.g., Run a marathon)"
              placeholderTextColor={Colors.dark.subtext}
              value={goalTitle}
              onChangeText={setGoalTitle}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your goal in detail. Be specific about what you want to achieve and why it matters to you."
              placeholderTextColor={Colors.dark.subtext}
              value={goalDescription}
              onChangeText={setGoalDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.aiInfoContainer}>
              <Brain size={20} color={Colors.dark.secondary} />
              <Text style={styles.aiInfoText}>
                DeckAI will use your goal details to generate personalized daily tasks and habits to help you succeed.
              </Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set Your Deadline</Text>
            <Text style={styles.stepDescription}>
              When do you want to achieve this goal? Setting a deadline creates urgency and accountability.
            </Text>
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
          </View>
        );
      default:
        return null;
    }
  };
  
  const isNextDisabled = () => {
    switch (step) {
      case 1: return !goalTitle.trim() || !goalDescription.trim();
      case 2: return !deadline || isCompleting || isGenerating;
      default: return false;
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Target size={32} color={Colors.dark.primary} />
              <Text style={styles.logoText}>DailyDeck</Text>
            </View>
            <Text style={styles.tagline}>Your AI-Powered Self-Mastery OS</Text>
            {user && <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>}
          </View>
          
          {renderStep()}
          
          <View style={styles.footer}>
            <View style={styles.progressIndicator}>
              {[1, 2].map(i => (
                <View 
                  key={i}
                  style={[
                    styles.progressDot,
                    i === step ? styles.activeDot : null
                  ]}
                />
              ))}
            </View>
            
            <Button
              title={step === 2 ? (isCompleting || isGenerating ? "Setting Up..." : "Get Started") : "Next"}
              onPress={handleNext}
              disabled={isNextDisabled()}
              loading={step === 2 && (isCompleting || isGenerating)}
              icon={!isCompleting && !isGenerating ? <ArrowRight size={16} color={Colors.dark.text} /> : undefined}
            />
            
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={logout}
            >
              <Text style={styles.logoutText}>Not you? Sign out</Text>
            </TouchableOpacity>
          </View>
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
        />
      )}
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: Colors.dark.primary,
    marginTop: 16,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginBottom: 24,
    lineHeight: 22,
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
    marginBottom: 16,
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
    marginTop: 8,
    alignItems: 'flex-start',
  },
  aiInfoText: {
    fontSize: 14,
    color: Colors.dark.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.inactive,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.dark.primary,
    width: 24,
  },
  logoutButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  logoutText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
});