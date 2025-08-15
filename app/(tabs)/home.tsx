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
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useUserStore } from '@/store/userStore';
import { trpc } from '@/lib/trpc';


import { getTodayDate, formatDateForDisplay } from '@/utils/dateUtils';
import TaskCard from '@/components/TaskCard';
import ProfileHeader from '@/components/ProfileHeader';
import Button from '@/components/Button';
import GoalCard from '@/components/GoalCard';
import AgendaCard from '@/components/AgendaCard';
import MotivationToast from '@/components/MotivationToast';

import GoalClarifyWizard from '@/components/GoalClarifyWizard';
import { generateMotivationMessage } from '@/utils/aiUtils';


export default function DashboardScreen() {
  const router = useRouter();
  const { goals, activeGoalId, setActiveGoal } = useGoalStore();
  const { 
    tasks, 
    getTasks
  } = useTaskStore();
  const { 
    profile, 
    coachSettings, 
    incrementMissedTasks,
    updateCoachSettings
  } = useUserStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [motivationVisible, setMotivationVisible] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState('');

  const [goalClarifyVisible, setGoalClarifyVisible] = useState(false);
  const [selectedGoalForClarify, setSelectedGoalForClarify] = useState<string | null>(null);
  
  // Test tRPC connection
  const hiQuery = trpc.example.hi.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    console.log('tRPC hi query status:', hiQuery.status);
    if (hiQuery.error) {
      console.error('tRPC hi query error:', hiQuery.error);
    }
    if (hiQuery.data) {
      console.log('tRPC hi query data:', hiQuery.data);
    }
  }, [hiQuery.status, hiQuery.error, hiQuery.data]);
  
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
  
  // Agenda functionality removed
  

  
  // Tasks are now generated automatically when goals are created
  
  // Motivation system disabled for now
  
  // Tasks are now generated automatically when goals are created
  
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Just refresh the data from stores
      // Tasks are generated when goals are created/updated
      console.log('Refreshing home screen data');
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleAICoachPress = () => {
    router.push('/(tabs)/coach');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };
  
  // Agenda functionality removed
  

  
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
      <View style={styles.container}>
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >

        
        {/* Agenda functionality removed */}
        
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
        
        {todayTasks.length > 0 ? (
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
            <Text style={styles.emptyStateText}>Tasks are generated when you create goals</Text>
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
            icon={<BookOpen size={16} />}
            style={styles.actionButton}
          />
          <Button
            title="Validate Task"
            onPress={() => router.push('/tasks')}
            icon={<Camera size={16} />}
            style={styles.actionButton}
          />
        </View>
        

      </ScrollView>
      
      {/* Motivation Toast */}
      <MotivationToast
        message={motivationMessage}
        tone={coachSettings.preferredTone}
        visible={motivationVisible}
        onDismiss={() => setMotivationVisible(false)}
        escalationLevel={Math.floor((coachSettings.missedTaskCount + coachSettings.missedStreakCount) / 2)}
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
    paddingBottom: 100,
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