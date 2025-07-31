import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';

import { 
  User, 
  Bell, 
  Brain, 
  Target,
  Heart,
  TrendingUp,
  Zap,
  ChevronRight,
  Settings as SettingsIcon,
  AlertTriangle,
  Trash2
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useUserStore, MotivationTone } from '@/store/userStore';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useJournalStore } from '@/store/journalStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, coachSettings, updateCoachSettings } = useUserStore();
  const { goals, resetEverything: resetGoals } = useGoalStore();
  const { resetTasks } = useTaskStore();
  const { resetEntries } = useJournalStore();
  const { resetAuth } = useAuthStore();
  
  const [localSettings, setLocalSettings] = useState(coachSettings);
  
  const handleToneChange = (tone: MotivationTone) => {
    const newSettings = { ...localSettings, preferredTone: tone };
    setLocalSettings(newSettings);
    updateCoachSettings(newSettings);
  };
  
  const handleToggle = (key: keyof typeof coachSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateCoachSettings(newSettings);
  };
  
  const handleTimeChange = (key: 'agendaTime' | 'recapTime', time: string) => {
    const newSettings = { ...localSettings, [key]: time };
    setLocalSettings(newSettings);
    updateCoachSettings(newSettings);
  };
  


  const resetEverything = () => {
    Alert.alert(
      '⚠️ DEVELOPER ONLY - Reset Everything',
      'This will permanently delete ALL your data including:\n\n• All goals and progress\n• All tasks and habits\n• All journal entries\n• All XP and streaks\n• All settings\n\nThis action cannot be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'DELETE EVERYTHING', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting reset everything process...');
              
              // Reset all stores
              console.log('Resetting goals...');
              await resetGoals();
              
              console.log('Resetting tasks...');
              await resetTasks();
              
              console.log('Resetting journal entries...');
              await resetEntries();
              
              // Reset user profile to defaults
              console.log('Resetting user profile...');
              const { updateProfile } = useUserStore.getState();
              await updateProfile({
                level: 1,
                xp: 0,
                xpToNextLevel: 100,
                streakDays: 0,
                longestStreak: 0
              });
              
              // Reset user settings
              console.log('Resetting coach settings...');
              updateCoachSettings({
                preferredTone: 'tough-love',
                agendaTime: '07:00',
                recapTime: '22:00',

                notificationsEnabled: true,
                missedTaskCount: 0,
                missedStreakCount: 0,
                lastMotivationSent: null,

              });
              
              // Reset auth state (but keep user logged in)
              console.log('Resetting auth state...');
              // Don't call resetAuth() as it would log the user out
              
              console.log('Reset complete!');
              Alert.alert('Success', 'All data has been reset. The app will restart.');
              
              // Navigate to onboarding
              router.replace('/onboarding');
            } catch (error) {
              console.error('Error resetting everything:', error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              Alert.alert('Error', `Failed to reset all data: ${errorMessage}. Please try again.`);
            }
          }
        }
      ]
    );
  };
  
  const getToneIcon = (tone: MotivationTone) => {
    switch (tone) {
      case 'data-driven':
        return <TrendingUp size={20} color={Colors.dark.primary} />;
      case 'tough-love':
        return <Zap size={20} color={Colors.dark.warning} />;
    }
  };
  
  const getToneDescription = (tone: MotivationTone) => {
    switch (tone) {
      case 'data-driven':
        return 'Focus on metrics, progress, and logical reasoning';
      case 'tough-love':
        return 'Direct, challenging, and accountability-focused';
    }
  };
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <SettingsIcon size={24} color={Colors.dark.primary} />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={Colors.dark.text} />
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/profile/edit')}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Edit Profile</Text>
              <Text style={styles.settingDescription}>
                Name, avatar, and personal information
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.subtext} />
          </TouchableOpacity>
          
          <View style={styles.statsContainer}>
            <View key="level" style={styles.statItem}>
              <Text style={styles.statValue}>{profile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View key="xp" style={styles.statItem}>
              <Text style={styles.statValue}>{profile.xp}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View key="streak" style={styles.statItem}>
              <Text style={styles.statValue}>{profile.streakDays}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View key="goals" style={styles.statItem}>
              <Text style={styles.statValue}>{goals.length}</Text>
              <Text style={styles.statLabel}>Active Goals</Text>
            </View>
          </View>
        </View>
        
        {/* Hustle Coach Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain size={20} color={Colors.dark.secondary} />
            <Text style={styles.sectionTitle}>Hustle Coach</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Motivation Tone</Text>
              <Text style={styles.settingDescription}>
                How Hustle communicates with you
              </Text>
            </View>
          </View>
          
          <View style={styles.toneOptions}>
            {(['tough-love', 'data-driven'] as MotivationTone[]).map((tone) => (
              <TouchableOpacity
                key={tone}
                style={[
                  styles.toneOption,
                  localSettings.preferredTone === tone && styles.toneOptionSelected
                ]}
                onPress={() => handleToneChange(tone)}
              >
                <View style={styles.toneOptionLeft}>
                  {getToneIcon(tone)}
                  <View style={styles.toneOptionText}>
                    <Text style={[
                      styles.toneOptionTitle,
                      localSettings.preferredTone === tone && styles.toneOptionTitleSelected
                    ]}>
                      {tone.charAt(0).toUpperCase() + tone.slice(1).replace('-', ' ')}
                    </Text>
                    <Text style={styles.toneOptionDescription}>
                      {getToneDescription(tone)}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  localSettings.preferredTone === tone && styles.radioButtonSelected
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Notifications & Timing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.dark.text} />
            <Text style={styles.sectionTitle}>Notifications & Timing</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Motivation messages and reminders
              </Text>
            </View>
            <Switch
              value={localSettings.notificationsEnabled}
              onValueChange={(value) => handleToggle('notificationsEnabled', value)}
              trackColor={{ false: Colors.dark.inactive, true: Colors.dark.primary }}
              thumbColor={Colors.dark.text}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Daily Agenda Time</Text>
              <Text style={styles.settingDescription}>
                When to generate your daily plan
              </Text>
            </View>
            <Text style={styles.timeValue}>{localSettings.agendaTime}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Nightly Recap Time</Text>
              <Text style={styles.settingDescription}>
                When to review your day and plan tomorrow
              </Text>
            </View>
            <Text style={styles.timeValue}>{localSettings.recapTime}</Text>
          </View>
        </View>
        

        
        {/* Manage Ultimate Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={Colors.dark.primary} />
            <Text style={styles.sectionTitle}>Manage Ultimate Goals</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/goals/create')}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Create New Goal</Text>
              <Text style={styles.settingDescription}>
                Set a new ultimate goal with AI-generated tasks
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.subtext} />
          </TouchableOpacity>
          
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalProgress}>
                    {Math.round(goal.progressValue)}% complete
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editGoalButton}
                  onPress={() => router.push(`/goals/edit?id=${goal.id}`)}
                >
                  <Text style={styles.editGoalText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}
            {goals.length === 0 && (
              <Text style={styles.noGoalsText}>
                No ultimate goals yet. Create your first goal to get started!
              </Text>
            )}
          </View>
        </View>
        
        {/* Developer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={Colors.dark.danger} />
            <Text style={styles.sectionTitle}>Developer Only</Text>
          </View>
          
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ This section is for development purposes only and will be removed in production.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={resetEverything}
          >
            <Trash2 size={20} color={Colors.dark.text} />
            <Text style={styles.dangerButtonText}>Reset Everything</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.appInfo}>
            Grind v2.0 - Enhanced with Hustle Coach
          </Text>
          <Text style={styles.appDescription}>
            Your intelligent companion for achieving goals through daily accountability and smart task management.
          </Text>
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 12,
  },
  section: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Colors.common.shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.separator,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  toneOptions: {
    marginTop: 8,
  },
  toneOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.dark.background,
  },
  toneOptionSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  toneOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toneOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  toneOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  toneOptionTitleSelected: {
    color: Colors.dark.primary,
  },
  toneOptionDescription: {
    fontSize: 13,
    color: Colors.dark.subtext,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.dark.inactive,
  },
  radioButtonSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary,
  },

  goalsList: {
    marginTop: 8,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  editGoalButton: {
    backgroundColor: Colors.dark.text,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editGoalText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.background,
  },
  noGoalsText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  appInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 118, 117, 0.3)',
  },
  warningText: {
    fontSize: 14,
    color: Colors.dark.danger,
    textAlign: 'center',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: Colors.dark.danger,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
});