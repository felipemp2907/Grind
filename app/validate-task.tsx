import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Camera, 
  Image as ImageIcon,
  CheckCircle,
  X,
  AlertCircle,
  Flame,
  Eye,
  ThumbsUp,
  RefreshCw
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTaskStore } from '@/store/taskStore';
import { useJournalStore } from '@/store/journalStore';
import { useUserStore } from '@/store/userStore';
import { useGoalStore } from '@/store/goalStore';
import Button from '@/components/Button';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { validateTaskImageWithFeedback } from '@/utils/aiUtils';

export default function ValidateTaskScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  
  const { getTaskById, completeTask, updateTask, resetStreak } = useTaskStore();
  const { addEntry } = useJournalStore();
  const { addXP, updateStreak: updateUserStreak, resetStreak: resetUserStreak } = useUserStore();
  const { goals } = useGoalStore();
  
  const [task, setTask] = useState(getTaskById(taskId));
  const [goal, setGoal] = useState(task ? goals.find(g => g.id === task.goalId) : null);
  const [journalContent, setJournalContent] = useState('');
  const [reflection, setReflection] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    confidence: 'high' | 'medium' | 'low';
    feedback: string;
    suggestions?: string[];
  } | null>(null);
  
  useEffect(() => {
    if (!task) {
      // Task not found, go back
      router.back();
    } else {
      setGoal(goals.find(g => g.id === task.goalId));
    }
  }, [task, router, goals]);
  
  const handleTakePhoto = async () => {
    if (Platform.OS !== 'web') {
      // Request permission to access the camera
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("Permission to access camera is required!");
        return;
      }
    }
    
    // Launch the camera
    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (!pickerResult.canceled) {
      setMediaUri(pickerResult.assets[0].uri);
      setMediaBase64(pickerResult.assets[0].base64 || null);
      
      // Reset validation result when new image is selected
      setValidationResult(null);
      
      // Provide haptic feedback on successful capture
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };
  
  const handlePickImage = async () => {
    // Request permission to access the camera roll
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }
    
    // Launch the image picker
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (!pickerResult.canceled) {
      setMediaUri(pickerResult.assets[0].uri);
      setMediaBase64(pickerResult.assets[0].base64 || null);
      
      // Reset validation result when new image is selected
      setValidationResult(null);
    }
  };
  
  const validateImage = async () => {
    if (!mediaBase64 || !task) return;
    
    setValidating(true);
    
    try {
      // Call AI to validate the image with enhanced feedback
      const result = await validateTaskImageWithFeedback(
        task.title,
        task.description,
        `data:image/jpeg;base64,${mediaBase64}`
      );
      
      setValidationResult(result);
      
      // Provide haptic feedback based on validation result
      if (Platform.OS !== 'web') {
        if (result.confidence === 'high' && result.isValid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (result.confidence === 'low' || !result.isValid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error('Error validating image:', error);
      // Default to approved if there's an error with the AI
      setValidationResult({
        isValid: true,
        confidence: 'medium',
        feedback: "I couldn't analyze the image properly, but I'll trust that you completed the task. Keep up the great work!",
        suggestions: ["Try taking a clearer photo next time", "Ensure good lighting for better validation"]
      });
    } finally {
      setValidating(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!task || !mediaUri) return;
    
    // Check validation requirements
    if (task.requiresValidation && (!validationResult || !validationResult.isValid)) {
      Alert.alert(
        "Validation Required",
        validationResult?.suggestions?.length 
          ? `Please address these suggestions:\n\n${validationResult.suggestions.join('\n')}`
          : "Please validate your task completion with an image that clearly shows your task.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setLoading(true);
    
    try {
      // Create journal entry for validation
      const journalEntryData = {
        date: task.date,
        title: `Task: ${task.title}`,
        content: journalContent || `Completed: ${task.title}`,
        taskId: task.id,
        mediaUri,
        reflection,
        createdAt: new Date().toISOString(),
        validationStatus: (validationResult?.isValid ? 'approved' : 'pending') as 'pending' | 'approved' | 'rejected',
        validationFeedback: validationResult?.feedback,
        validationConfidence: validationResult?.confidence
      };
      
      // Add journal entry and get the created entry with UUID
      const journalEntry = await addEntry(journalEntryData);
      
      if (!journalEntry) {
        throw new Error('Failed to create journal entry');
      }
      
      // Mark task as completed
      await completeTask(task.id, journalEntry.id);
      
      // Add XP with bonus for high confidence validation
      let xpBonus = 0;
      if (validationResult?.confidence === 'high') {
        xpBonus = Math.floor(task.xpValue * 0.2); // 20% bonus for high confidence
      }
      await addXP(task.xpValue + xpBonus);
      
      // Update streak if it's a habit
      if (task.isHabit) {
        await updateUserStreak(true);
      }
      
      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Show success message if there was an XP bonus
      if (xpBonus > 0) {
        Alert.alert(
          "Excellent Work!",
          `Task completed with high confidence! You earned ${task.xpValue} XP + ${xpBonus} bonus XP for clear proof.`,
          [{ text: "Awesome!" }]
        );
      }
      
      // Navigate back after a short delay
      setTimeout(() => {
        setLoading(false);
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error completing task:', error);
      setLoading(false);
      Alert.alert(
        "Error",
        "There was an error completing your task. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  const handleRejectTask = () => {
    if (!task) return;
    
    // If it's a habit, reset the streak
    if (task.isHabit) {
      // Reset task streak
      resetStreak(task.id);
      
      // If this is the active streak, reset user streak
      if (task.streak > 0) {
        resetUserStreak();
      }
      
      Alert.alert(
        "Streak Reset",
        "Your streak for this habit has been reset to 0. Upload a valid image to maintain your streak.",
        [{ text: "OK" }]
      );
    }
    
    // Navigate back
    router.back();
  };
  
  const getValidationIcon = () => {
    if (!validationResult) return null;
    
    switch (validationResult.confidence) {
      case 'high':
        return <CheckCircle size={20} color={Colors.dark.success} />;
      case 'medium':
        return <Eye size={20} color={Colors.dark.warning} />;
      case 'low':
        return <AlertCircle size={20} color={Colors.dark.danger} />;
      default:
        return null;
    }
  };
  
  const getValidationColor = () => {
    if (!validationResult) return Colors.dark.card;
    
    switch (validationResult.confidence) {
      case 'high':
        return 'rgba(0, 184, 148, 0.1)';
      case 'medium':
        return 'rgba(253, 203, 110, 0.1)';
      case 'low':
        return 'rgba(255, 118, 117, 0.1)';
      default:
        return Colors.dark.card;
    }
  };
  
  const getValidationBorderColor = () => {
    if (!validationResult) return 'transparent';
    
    switch (validationResult.confidence) {
      case 'high':
        return Colors.dark.success;
      case 'medium':
        return Colors.dark.warning;
      case 'low':
        return Colors.dark.danger;
      default:
        return 'transparent';
    }
  };
  
  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskDescription}>{task.description}</Text>
            
            {goal && (
              <View style={styles.goalBadge}>
                <Text style={styles.goalText}>Goal: {goal.title}</Text>
              </View>
            )}
            
            <View style={styles.badgeContainer}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>+{task.xpValue} XP</Text>
              </View>
              
              {task.isHabit && (
                <View style={styles.streakBadge}>
                  <Flame size={12} color={Colors.dark.warning} />
                  <Text style={styles.streakText}>
                    {task.streak > 0 ? `${task.streak} day streak` : 'Start streak'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Upload Proof</Text>
          <Text style={styles.sectionDescription}>
            Take a photo or upload an image to validate your task completion.
            {task.isHabit ? ' Maintaining your streak requires valid proof.' : ''}
          </Text>
          
          {mediaUri ? (
            <View style={styles.mediaPreviewContainer}>
              <Image 
                source={{ uri: mediaUri }} 
                style={styles.mediaPreview}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeMediaButton}
                onPress={() => {
                  setMediaUri(null);
                  setMediaBase64(null);
                  setValidationResult(null);
                }}
              >
                <X size={20} color={Colors.dark.text} />
              </TouchableOpacity>
              
              {validationResult && (
                <View style={[styles.validationBadge, { backgroundColor: getValidationColor() }]}>
                  {getValidationIcon()}
                  <Text style={styles.validationText}>
                    {validationResult.confidence === 'high' ? 'Excellent Proof!' : 
                     validationResult.confidence === 'medium' ? 'Good Proof' : 
                     'Needs Improvement'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={handleTakePhoto}
              >
                <Camera size={32} color={Colors.dark.primary} />
                <Text style={styles.mediaButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={handlePickImage}
              >
                <ImageIcon size={32} color={Colors.dark.primary} />
                <Text style={styles.mediaButtonText}>Upload Image</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {mediaUri && task.requiresValidation && !validationResult && (
            <Button
              title={validating ? "Analyzing..." : "Validate with AI Vision"}
              onPress={validateImage}
              disabled={validating}
              loading={validating}
              icon={<Eye size={16} color="#FFFFFF" />}
              style={styles.validateButton}
            />
          )}
          
          {validationResult && (
            <View style={[
              styles.feedbackContainer,
              { 
                backgroundColor: getValidationColor(),
                borderLeftColor: getValidationBorderColor()
              }
            ]}>
              <View style={styles.feedbackHeader}>
                {getValidationIcon()}
                <Text style={styles.feedbackTitle}>
                  AI Vision Analysis ({validationResult.confidence} confidence)
                </Text>
              </View>
              <Text style={styles.feedbackText}>{validationResult.feedback}</Text>
              
              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Suggestions for better proof:</Text>
                  {validationResult.suggestions.map((suggestion, index) => (
                    <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                  ))}
                </View>
              )}
              
              {validationResult.confidence === 'high' && validationResult.isValid && (
                <View style={styles.bonusContainer}>
                  <ThumbsUp size={16} color={Colors.dark.success} />
                  <Text style={styles.bonusText}>
                    Excellent proof! You'll earn a 20% XP bonus.
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <Text style={styles.sectionTitle}>Journal Entry</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="Describe how you completed this task..."
            placeholderTextColor={Colors.dark.subtext}
            value={journalContent}
            onChangeText={setJournalContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <Text style={styles.sectionTitle}>Reflection (Optional)</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="What did you learn? What would you do differently next time?"
            placeholderTextColor={Colors.dark.subtext}
            value={reflection}
            onChangeText={setReflection}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          
          <Button
            title="Complete Task"
            onPress={handleSubmit}
            disabled={!mediaUri || loading || (task.requiresValidation && (!validationResult || !validationResult.isValid))}
            loading={loading}
            icon={<CheckCircle size={16} color="#FFFFFF" />}
            style={styles.submitButton}
          />
          
          {validationResult && !validationResult.isValid && (
            <View style={styles.rejectionActions}>
              <Text style={styles.rejectionMessage}>
                Please upload a different image that clearly shows your task completion.
              </Text>
              
              {task.isHabit && (
                <Button
                  title="Skip Task (Reset Streak)"
                  onPress={handleRejectTask}
                  variant="danger"
                  style={styles.rejectButton}
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
  },
  taskCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Colors.common.shadow,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 12,
  },
  goalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 12,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 203, 110, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.warning,
    marginLeft: 4,
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
    marginBottom: 16,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    ...Colors.common.shadow,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginTop: 8,
  },
  mediaPreviewContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  validationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 4,
  },
  validateButton: {
    marginBottom: 24,
    backgroundColor: Colors.dark.primary,
  },
  feedbackContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.dark.subtext,
    marginBottom: 2,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.dark.success,
    marginLeft: 4,
  },
  journalInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 24,
    minHeight: 120,
  },
  submitButton: {
    marginTop: 8,
  },
  rejectionActions: {
    marginTop: 16,
  },
  rejectionMessage: {
    fontSize: 14,
    color: Colors.dark.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  rejectButton: {
    marginTop: 8,
  },
});