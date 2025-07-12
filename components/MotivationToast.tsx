import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { 
  Heart, 
  TrendingUp, 
  Zap, 
  X,
  Target
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MotivationTone } from '@/store/userStore';
import * as Haptics from 'expo-haptics';

interface MotivationToastProps {
  message: string;
  tone: MotivationTone;
  visible: boolean;
  onDismiss: () => void;
  escalationLevel?: number;
  urgency?: 'low' | 'medium' | 'high';
  actionSuggestion?: string;
  onActionTap?: () => void;
}

export default function MotivationToast({ 
  message, 
  tone, 
  visible, 
  onDismiss,
  escalationLevel = 0,
  urgency = 'low',
  actionSuggestion,
  onActionTap
}: MotivationToastProps) {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacityAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    if (visible) {
      // Provide haptic feedback when toast appears
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          escalationLevel > 2 
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        );
      }
      
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, escalationLevel]);
  
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };
  
  const getToneIcon = () => {
    switch (tone) {
      case 'cheerful':
        return <Heart size={20} color={Colors.dark.success} />;
      case 'data-driven':
        return <TrendingUp size={20} color={Colors.dark.primary} />;
      case 'tough-love':
        return <Zap size={20} color={Colors.dark.warning} />;
      default:
        return <Target size={20} color={Colors.dark.primary} />;
    }
  };
  
  const getToneColors = () => {
    switch (tone) {
      case 'cheerful':
        return {
          background: 'rgba(0, 184, 148, 0.95)',
          border: Colors.dark.success,
        };
      case 'data-driven':
        return {
          background: 'rgba(108, 92, 231, 0.95)',
          border: Colors.dark.primary,
        };
      case 'tough-love':
        return {
          background: 'rgba(253, 203, 110, 0.95)',
          border: Colors.dark.warning,
        };
      default:
        return {
          background: 'rgba(108, 92, 231, 0.95)',
          border: Colors.dark.primary,
        };
    }
  };
  
  const getEscalationStyle = () => {
    if (escalationLevel > 2) {
      return {
        borderWidth: 2,
        borderColor: Colors.dark.danger,
        shadowColor: Colors.dark.danger,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      };
    }
    return {};
  };
  
  if (!visible) return null;
  
  const colors = getToneColors();
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: colors.background,
          borderLeftColor: colors.border,
        },
        getEscalationStyle(),
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getToneIcon()}
        </View>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <X size={18} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>
      
      {escalationLevel > 0 && (
        <View style={styles.escalationIndicator}>
          <Text style={styles.escalationText}>
            Escalation Level {escalationLevel}/4
          </Text>
        </View>
      )}
      
      {actionSuggestion && onActionTap && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onActionTap}
        >
          <Text style={styles.actionButtonText}>{actionSuggestion}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  escalationIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  escalationText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.dark.text,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
});