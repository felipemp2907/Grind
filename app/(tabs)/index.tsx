import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Camera, 
  ChevronRight, 
  Brain,
  Target,
  Settings,
  Flame,
  BookOpen,
  Calendar,
  Focus,

  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { getTodayDate, formatDateForDisplay } from '@/utils/dateUtils';
import TaskCard from '@/components/TaskCard';
import ProfileHeader from '@/components/ProfileHeader';
import Button from '@/components/Button';
import GoalCard from '@/components/GoalCard';
import AgendaCard from '@/components/AgendaCard';
import MotivationToast from '@/components/MotivationToast';
import FocusModePrompt from '@/components/FocusModePrompt';
import FocusShortcut from '@/components/FocusShortcut';
import GoalClarifyWizard from '@/components/GoalClarifyWizard';
import { generateMotivationMessage } from '@/utils/aiUtils';

export default function DashboardScreen() {
  const router = useRouter();
  const { goals, activeGoalId, setActiveGoal } = useGoalStore();
  const { 
    tasks, 
    getTasks, 
    generateDailyTasks, 
    isGenerating,
    generateDailyAgenda,
    acceptAgenda,
    regenerateAgenda,
    getAgenda,
    isGeneratingAgenda
  } = useTaskStore();
  const { 
    profile, 
    coachSettings, 
    incrementMissedTasks,
    recordBlurEvent,
    startFocusSession,
    updateCoachSettings
  } = useUserStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [motivationVisible, setMotivationVisible] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [focusPromptVisible, setFocusPromptVisible] = useState(false);
  const [lastBlurCheck, setLastBlurCheck] = useState(Date.now());
  const [goalClarifyVisible, setGoalClarifyVisible] = useState(false);
  const [selectedGoalForClarify, setSelectedGoalForClarify] = useState<string | null>(null);
  
  const todayDate = getTodayDate();
  const todayTasks = getTasks(todayDate);
  const completedTasks = todayTasks.filter(task => task.completed);
  const completionRate = todayTasks.length > 0 
    ? completedTasks.length / todayTasks.length 
    : 0;
  
  // Get streak tasks
  const streakTasks = todayTasks.filter(task => task.isHabit);
  
  // Get priority tasks (top 3 incomplete tasks)
  const priorityTasks = todayTasks
    .filter(task => !task.completed)
    .sort((a, b) => b.xpValue - a.xpValue)
    .slice(0, 3);
  
  // Get today's agenda
  const todayAgenda = getAgenda(todayDate);
  
  // Focus mode detection (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && coachSettings.focusModeEnabled) {
      const handleBlur = () => {
        recordBlurEvent();
        
        // Check if we should show focus prompt
        const now = Date.now();
        const timeSinceLastCheck = now - lastBlurCheck;
        
        // If more than 5 blur events in 10 minutes, suggest focus mode
        if (timeSinceLastCheck > 10 * 60 * 1000) { // Reset every 10 minutes
          setLastBlurCheck(now);
          
          if (coachSettings.focusStats.blurEvents >= 5 && !coachSettings.focusStats.focusPromptSent) {
            setFocusPromptVisible(true);
            updateCoachSettings({
              focusStats: {
                ...coachSettings.focusStats,
                focusPromptSent: true
              }
            });
          }
        }
      };
      
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }
  }, [coachSettings.focusModeEnabled, coachSettings.focusStats, lastBlurCheck]);
  
  // Generate daily agenda at 7 AM (simulated for demo)
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Generate agenda if it's morning and no agenda exists
    if (currentHour >= 7 && currentHour < 10 && !todayAgenda && goals.length > 0) {
      generateDailyAgenda(todayDate);
    }
  }, [todayDate, goals.length, todayAgenda]);
  
  // Check for missed tasks and show motivation
  useEffect(() => {
    const checkMissedTasks = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];
      
      const yesterdayTasks = getTasks(yesterdayDate);
      const missedTasks = yesterdayTasks.filter(task => !task.completed);
      
      if (missedTasks.length > 0 && coachSettings.notificationsEnabled) {
        // Check if we should show motivation based on time since last one
        const lastMotivation = coachSettings.lastMotivationSent;
        const now = Date.now();
        const hoursSinceLastMotivation = lastMotivation 
          ? (now - new Date(lastMotivation).getTime()) / (1000 * 60 * 60)
          : 24;
        
        if (hoursSinceLastMotivation >= 4) { // Show motivation every 4 hours max
          try {
            const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];
            if (activeGoal) {
              const message = await generateMotivationMessage(
                coachSettings.missedTaskCount,
                coachSettings.missedStreakCount,
                coachSettings.preferredTone,
                activeGoal.title,
                profile.streakDays
              );
              
              setMotivationMessage(message);
              setMotivationVisible(true);
              
              updateCoachSettings({
                lastMotivationSent: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error generating motivation message:', error);
          }
        }
      }
    };
    
    // Check for missed tasks after a delay to avoid blocking initial render
    const timer = setTimeout(checkMissedTasks, 2000);
    return () => clearTimeout(timer);
  }, [todayDate]);
  
  useEffect(() => {
    // Generate daily tasks if none exist
    if (todayTasks.length === 0 && goals.length > 0) {
      generateDailyTasks(todayDate);
    }
  }, [todayDate, goals.length]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh data
      await generateDailyTasks(todayDate);
      if (!todayAgenda) {
        await generateDailyAgenda(todayDate);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleAICoachPress = () => {
    router.push('/coach');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };
  
  const handleAcceptAgenda = () => {
    if (todayAgenda) {
      acceptAgenda(todayDate);
    }
  };
  
  const handleRegenerateAgenda = async () => {
    if (todayAgenda) {
      await regenerateAgenda(todayDate);
    }
  };
  
  const handleStartFocus = () => {
    startFocusSession();
    setFocusPromptVisible(false);
  };
  
  const handleGoalClarify = (goalId: string) => {
    setSelectedGoalForClarify(goalId);
    setGoalClarifyVisible(true);
  };
  
  const handleGoalClarifyComplete = (context: any) => {
    // Handle the goal clarification completion
    console.log('Goal clarification completed:', context);
    setGoalClarifyVisible(false);
    setSelectedGoalForClarify(null);
    // You can use this context to generate better tasks
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatDateForDisplay(todayDate)}</Text>
          <Text style={styles.greeting}>Hello, {profile.name || 'Achiever'}</Text>
        </View>
        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
          <Settings size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isGenerating} 
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >
        {/* Focus Mode Shortcut */}
        <FocusShortcut />
        
        {/* Daily Agenda Card */}
        {todayAgenda && (
          <AgendaCard
            agenda={todayAgenda}
            onAccept={handleAcceptAgenda}
            onRegenerate={handleRegenerateAgenda}
            isGenerating={isGeneratingAgenda}
          />
        )}
        
        {priorityTasks.length > 0 && (
          <View style={styles.priorityContainer}>
            <Text style={styles.priorityText}>
              You have {priorityTasks.length} priority task{priorityTasks.length !== 1 ? 's' : ''} today:
            </Text>
            <Text style={styles.priorityTasks}>
              {priorityTasks.map((task, index) => 
                `${index > 0 ? ', ' : ''}${task.title}`
              )}
            </Text>
          </View>
        )}
        
        <ProfileHeader profile={profile} />
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Ultimate Goals</Text>
          {goals.length < 3 && (
            <TouchableOpacity 
              onPress={() => router.push('/goals/create')}
              style={styles.addGoalButton}
            >
              <Text style={styles.addGoalText}>Add Goal</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {goals.length > 0 ? (
          <View style={styles.goalsContainer}>
            {goals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                isActive={goal.id === activeGoalId}
                onPress={() => setActiveGoal(goal.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Target size={48} color={Colors.dark.inactive} />
            <Text style={styles.emptyStateTitle}>No Goals Set</Text>
            <Text style={styles.emptyStateText}>
              Set your ultimate goals to start your journey
            </Text>
            <Button 
              title="Set Your First Goal" 
              onPress={() => router.push('/goals/create')}
              style={styles.emptyStateButton}
            />
          </View>
        )}
        
        {streakTasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Flame size={16} color={Colors.dark.warning} style={styles.sectionIcon} />
                Streak Tasks
              </Text>
              <Text style={styles.streakCount}>
                {streakTasks.filter(t => t.completed).length}/{streakTasks.length} Completed
              </Text>
            </View>
            
            <View style={styles.tasksContainer}>
              {streakTasks.slice(0, 2).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              
              {streakTasks.length > 2 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/tasks')}
                >
                  <Text style={styles.viewAllText}>View All Streak Tasks</Text>
                  <ChevronRight size={16} color={Colors.dark.warning} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <Text style={styles.taskCount}>
            {completedTasks.length}/{todayTasks.length} Completed
          </Text>
        </View>
        
        {isGenerating && todayTasks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>
              Hustle is generating high-quality tasks for your goals...
            </Text>
          </View>
        ) : todayTasks.length > 0 ? (
          <View style={styles.tasksContainer}>
            {todayTasks
              .filter(task => !task.isHabit) // Show only non-habit tasks here
              .slice(0, 3)
              .map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            
            {todayTasks.filter(task => !task.isHabit).length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/tasks')}
              >
                <Text style={styles.viewAllText}>View All Tasks</Text>
                <ChevronRight size={16} color={Colors.dark.primary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks for today</Text>
            <Button 
              title={isGenerating ? "Generating..." : "Generate Tasks"}
              onPress={() => generateDailyTasks(todayDate)}
              size="small"
              loading={isGenerating}
              disabled={isGenerating}
            />
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.coachCard}
          onPress={handleAICoachPress}
          activeOpacity={0.8}
        >
          <View style={styles.coachContent}>
            <Brain size={24} color={Colors.dark.secondary} />
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachTitle}>Ask Hustle Coach</Text>
              <Text style={styles.coachDescription}>
                Get personalized advice, create tasks, or schedule your day
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.dark.subtext} />
        </TouchableOpacity>
        
        {goals.length > 0 && (
          <TouchableOpacity 
            style={styles.clarifyCard}
            onPress={() => handleGoalClarify(activeGoalId || goals[0].id)}
            activeOpacity={0.8}
          >
            <View style={styles.coachContent}>
              <Target size={24} color={Colors.dark.primary} />
              <View style={styles.coachTextContainer}>
                <Text style={styles.coachTitle}>Goal Clarification</Text>
                <Text style={styles.coachDescription}>
                  Get more specific about your goals for better task generation
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.dark.subtext} />
          </TouchableOpacity>
        )}
        

        
        <View style={styles.quickActions}>
          <Button
            title="Add Journal Entry"
            onPress={() => router.push('/journal')}
            variant="outline"
            icon={<BookOpen size={16} color={Colors.dark.primary} />}
            style={styles.actionButton}
          />
          <Button
            title="Validate Task"
            onPress={() => router.push('/tasks')}
            icon={<Camera size={16} color={Colors.dark.text} />}
            style={styles.actionButton}
          />
        </View>
        
        {Platform.OS === 'web' && coachSettings.focusModeEnabled && (
          <TouchableOpacity 
            style={styles.focusCard}
            onPress={() => setFocusPromptVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.focusContent}>
              <Focus size={20} color={Colors.dark.warning} />
              <View style={styles.focusTextContainer}>
                <Text style={styles.focusTitle}>Focus Mode</Text>
                <Text style={styles.focusDescription}>
                  {coachSettings.focusStats.blurEvents > 0 
                    ? `${coachSettings.focusStats.blurEvents} distractions detected`
                    : 'Start a focused work session'
                  }
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={Colors.dark.subtext} />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Motivation Toast */}
      <MotivationToast
        message={motivationMessage}
        tone={coachSettings.preferredTone}
        visible={motivationVisible}
        onDismiss={() => setMotivationVisible(false)}
        escalationLevel={Math.floor((coachSettings.missedTaskCount + coachSettings.missedStreakCount) / 2)}
      />
      
      {/* Focus Mode Prompt */}
      <FocusModePrompt
        visible={focusPromptVisible}
        onDismiss={() => setFocusPromptVisible(false)}
        onStartFocus={handleStartFocus}
        blurCount={coachSettings.focusStats.blurEvents}
      />
      
      {/* Goal Clarification Wizard */}
      {selectedGoalForClarify && (
        <GoalClarifyWizard
          visible={goalClarifyVisible}
          onDismiss={() => {
            setGoalClarifyVisible(false);
            setSelectedGoalForClarify(null);
          }}
          onComplete={handleGoalClarifyComplete}
          goalTitle={goals.find(g => g.id === selectedGoalForClarify)?.title || ''}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  date: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  priorityContainer: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  priorityTasks: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 6,
  },
  addGoalButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addGoalText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  goalsContainer: {
    marginBottom: 24,
  },
  taskCount: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  streakCount: {
    fontSize: 14,
    color: Colors.dark.warning,
    fontWeight: '600',
  },
  tasksContainer: {
    marginBottom: 24,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.dark.subtext,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    minWidth: 180,
  },
  coachCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Colors.common.shadow,
  },
  clarifyCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
    ...Colors.common.shadow,
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  coachTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  coachDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  focusCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.warning,
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  focusTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  focusDescription: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },

});