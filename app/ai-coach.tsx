import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Brain, 
  ArrowRight,
  Target,
  BarChart,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { generateCoachingFeedback } from '@/utils/aiUtils';
import { getTodayDate } from '@/utils/dateUtils';
import Button from '@/components/Button';

export default function AICoachScreen() {
  const { goals, activeGoalId } = useGoalStore();
  const goal = goals.find(g => g.id === activeGoalId) || goals[0];
  const { tasks, getTasks } = useTaskStore();
  const { profile } = useUserStore();
  
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get recent tasks for context
  const recentTasks = getTasks(getTodayDate());
  
  useEffect(() => {
    generateFeedback();
  }, []);
  
  const generateFeedback = async () => {
    if (!goal) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const taskData = recentTasks.map(task => ({
        title: task.title,
        completed: task.completed
      }));
      
      const response = await generateCoachingFeedback(
        goal.title,
        taskData,
        profile.streakDays
      );
      
      setFeedback(response);
    } catch (error) {
      console.error('Error generating feedback:', error);
      setError("Couldn't connect to Alvo. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "Alvo Coach",
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Brain size={40} color={Colors.dark.secondary} />
            <Text style={styles.title}>AI Coaching Insights</Text>
            <Text style={styles.subtitle}>
              Personalized guidance to help you achieve your goals
            </Text>
          </View>
          
          <View style={styles.card}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
                <Text style={styles.loadingText}>Alvo is analyzing your progress...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button 
                  title="Try Again" 
                  onPress={generateFeedback}
                  size="small"
                  style={styles.retryButton}
                />
              </View>
            ) : (
              <Text style={styles.feedbackText}>{feedback}</Text>
            )}
          </View>
          
          <Text style={styles.sectionTitle}>Quick Insights</Text>
          
          <View style={styles.insightsContainer}>
            <TouchableOpacity style={styles.insightCard}>
              <View style={styles.insightIconContainer}>
                <Target size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.insightTitle}>Goal Progress</Text>
              <Text style={styles.insightDescription}>
                See how close you are to achieving your ultimate goal
              </Text>
              <ArrowRight size={16} color={Colors.dark.primary} style={styles.insightArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.insightCard}>
              <View style={styles.insightIconContainer}>
                <BarChart size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.insightTitle}>Task Analysis</Text>
              <Text style={styles.insightDescription}>
                Review your task completion patterns and trends
              </Text>
              <ArrowRight size={16} color={Colors.dark.primary} style={styles.insightArrow} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.insightCard}>
              <View style={styles.insightIconContainer}>
                <Zap size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.insightTitle}>Productivity Tips</Text>
              <Text style={styles.insightDescription}>
                Get personalized tips to boost your productivity
              </Text>
              <ArrowRight size={16} color={Colors.dark.primary} style={styles.insightArrow} />
            </TouchableOpacity>
          </View>
          
          <Button
            title="Refresh Insights"
            onPress={generateFeedback}
            disabled={loading}
            style={styles.refreshButton}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    minHeight: 200,
    ...Colors.common.shadow,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
  },
  feedbackText: {
    fontSize: 16,
    color: Colors.dark.text,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  insightsContainer: {
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Colors.common.shadow,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 8,
  },
  insightArrow: {
    alignSelf: 'flex-end',
  },
  refreshButton: {
    marginTop: 8,
  },
});