import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  ThumbsUp,
  X
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { validateTaskImageWithFeedback } from '@/utils/aiUtils';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

interface GuidedProofFeedbackProps {
  taskTitle: string;
  taskDescription: string;
  onProofValidated: (result: {
    isValid: boolean;
    confidence: 'high' | 'medium' | 'low';
    feedback: string;
    mediaUri: string;
    xpBonus?: number;
  }) => void;
  onCancel: () => void;
  requiresRealtime?: boolean;
}

export default function GuidedProofFeedback({
  taskTitle,
  taskDescription,
  onProofValidated,
  onCancel,
  requiresRealtime = false
}: GuidedProofFeedbackProps) {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [retakeCount, setRetakeCount] = useState(0);

  const handleTakePhoto = async () => {
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Camera access is required to validate your task completion.");
        return;
      }
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!pickerResult.canceled) {
      setMediaUri(pickerResult.assets[0].uri);
      setMediaBase64(pickerResult.assets[0].base64 || null);
      setValidationResult(null);

      // Auto-validate after taking photo
      setTimeout(() => {
        validateImage(pickerResult.assets[0].base64 || '');
      }, 500);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handlePickImage = async () => {
    if (requiresRealtime) {
      Alert.alert(
        "Camera Required",
        "This task requires real-time proof. Please use the camera to take a photo.",
        [{ text: "OK" }]
      );
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Photo library access is required.");
      return;
    }

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
      setValidationResult(null);

      // Auto-validate after selecting image
      setTimeout(() => {
        validateImage(pickerResult.assets[0].base64 || '');
      }, 500);
    }
  };

  const validateImage = async (base64Data?: string) => {
    const imageData = base64Data || mediaBase64;
    if (!imageData) return;

    setIsValidating(true);

    try {
      const result = await validateTaskImageWithFeedback(
        taskTitle,
        taskDescription,
        `data:image/jpeg;base64,${imageData}`
      );

      setValidationResult(result);

      // Provide haptic feedback based on result
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
      setValidationResult({
        isValid: true,
        confidence: 'medium',
        feedback: "I couldn't analyze the image properly, but I'll trust that you completed the task!",
        suggestions: ["Try taking a clearer photo next time"]
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptProof = () => {
    if (!validationResult || !mediaUri) return;

    let xpBonus = 0;
    if (validationResult.confidence === 'high' && validationResult.isValid) {
      xpBonus = 10; // Bonus XP for high confidence proof
    }

    onProofValidated({
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      feedback: validationResult.feedback,
      mediaUri,
      xpBonus
    });
  };

  const handleRetakePhoto = () => {
    setRetakeCount(prev => prev + 1);
    setMediaUri(null);
    setMediaBase64(null);
    setValidationResult(null);
    handleTakePhoto();
  };

  const getValidationIcon = () => {
    if (!validationResult) return null;

    switch (validationResult.confidence) {
      case 'high':
        return <CheckCircle size={24} color={Colors.dark.success} />;
      case 'medium':
        return <Eye size={24} color={Colors.dark.warning} />;
      case 'low':
        return <AlertCircle size={24} color={Colors.dark.danger} />;
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

  const getFeedbackTitle = () => {
    if (!validationResult) return '';

    if (validationResult.confidence === 'high' && validationResult.isValid) {
      return '🎉 Excellent Proof!';
    } else if (validationResult.confidence === 'medium') {
      return '👍 Good Proof';
    } else {
      return '🤔 Needs Improvement';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Validate Task Completion</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={Colors.dark.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{taskTitle}</Text>
        <Text style={styles.taskDescription}>{taskDescription}</Text>
        {requiresRealtime && (
          <View style={styles.realtimeBadge}>
            <Camera size={14} color={Colors.dark.warning} />
            <Text style={styles.realtimeText}>Camera Required</Text>
          </View>
        )}
      </View>

      {!mediaUri ? (
        <View style={styles.captureSection}>
          <Text style={styles.instructionText}>
            Take a photo to validate your task completion
          </Text>
          
          <View style={styles.captureButtons}>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleTakePhoto}
            >
              <Camera size={32} color={Colors.dark.primary} />
              <Text style={styles.captureButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            {!requiresRealtime && (
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={handlePickImage}
              >
                <Image size={32} color={Colors.dark.primary} />
                <Text style={styles.captureButtonText}>Choose Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.previewSection}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
            
            {isValidating && (
              <View style={styles.validatingOverlay}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
                <Text style={styles.validatingText}>Analyzing...</Text>
              </View>
            )}
          </View>

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
                <Text style={styles.feedbackTitle}>{getFeedbackTitle()}</Text>
              </View>
              
              <Text style={styles.feedbackText}>{validationResult.feedback}</Text>

              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                  {validationResult.suggestions.map((suggestion: string, index: number) => (
                    <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                  ))}
                </View>
              )}

              {validationResult.confidence === 'high' && validationResult.isValid && (
                <View style={styles.bonusContainer}>
                  <ThumbsUp size={16} color={Colors.dark.success} />
                  <Text style={styles.bonusText}>+10 XP bonus for excellent proof!</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            {validationResult?.isValid ? (
              <Button
                title="Accept & Complete Task"
                onPress={handleAcceptProof}
                icon={<CheckCircle size={16} color={Colors.dark.text} />}
                style={styles.acceptButton}
              />
            ) : (
              <Button
                title="Retake Photo"
                onPress={handleRetakePhoto}
                icon={<RefreshCw size={16} color={Colors.dark.text} />}
                style={styles.retakeButton}
              />
            )}
            
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>

          {retakeCount > 0 && (
            <Text style={styles.retakeCount}>
              Retakes: {retakeCount}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  closeButton: {
    padding: 4,
  },
  taskInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    lineHeight: 20,
  },
  realtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 203, 110, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  realtimeText: {
    fontSize: 12,
    color: Colors.dark.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  captureSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  captureButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  captureButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    ...Colors.common.shadow,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginTop: 8,
  },
  previewSection: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  validatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validatingText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginTop: 12,
    fontWeight: '600',
  },
  feedbackContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 2,
  },
  retakeButton: {
    flex: 2,
  },
  cancelButton: {
    flex: 1,
  },
  retakeCount: {
    fontSize: 12,
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginTop: 8,
  },
});