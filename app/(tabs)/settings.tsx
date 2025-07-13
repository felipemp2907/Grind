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
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Bell, 
  Brain, 
  Clock, 
  Focus,
  Heart,
  TrendingUp,
  Zap,
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useUserStore, MotivationTone } from '@/store/userStore';
import { useGoalStore } from '@/store/goalStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, coachSettings, updateCoachSettings } = useUserStore();
  const { goals } = useGoalStore();
  
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
  
  const resetMissedCounts = () => {
    Alert.alert(
      'Reset Motivation Tracking',
      'This will reset your missed task and streak counts. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            updateCoachSettings({
              missedTaskCount: 0,
              missedStreakCount: 0,
              lastMotivationSent: null
            });
            setLocalSettings(prev => ({
              ...prev,
              missedTaskCount: 0,
              missedStreakCount: 0,
              lastMotivationSent: null
            }));
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.xp}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.streakDays}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
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
        
        {/* Focus Mode */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Focus size={20} color={Colors.dark.warning} />
            <Text style={styles.sectionTitle}>Focus Mode</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Enable Focus Mode</Text>
              <Text style={styles.settingDescription}>
                Detect distractions and suggest focus sessions
              </Text>
            </View>
            <Switch
              value={localSettings.focusModeEnabled}
              onValueChange={(value) => handleToggle('focusModeEnabled', value)}
              trackColor={{ false: Colors.dark.inactive, true: Colors.dark.warning }}
              thumbColor={Colors.dark.text}
            />
          </View>
          
          {localSettings.focusModeEnabled && (
            <View style={styles.focusStats}>
              <Text style={styles.focusStatsTitle}>Today's Focus Stats</Text>
              <View style={styles.focusStatsGrid}>
                <View style={styles.focusStatItem}>
                  <Text style={styles.focusStatValue}>
                    {localSettings.focusStats.blurEvents}
                  </Text>
                  <Text style={styles.focusStatLabel}>Distractions</Text>
                </View>
                <View style={styles.focusStatItem}>
                  <Text style={styles.focusStatValue}>
                    {localSettings.focusStats.focusSessionsToday}
                  </Text>
                  <Text style={styles.focusStatLabel}>Focus Sessions</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        
        {/* Motivation Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.dark.subtext} />
            <Text style={styles.sectionTitle}>Motivation Tracking</Text>
          </View>
          
          <View style={styles.motivationStats}>
            <View style={styles.motivationStatItem}>
              <Text style={styles.motivationStatValue}>
                {localSettings.missedTaskCount}
              </Text>
              <Text style={styles.motivationStatLabel}>Missed Tasks</Text>
            </View>
            <View style={styles.motivationStatItem}>
              <Text style={styles.motivationStatValue}>
                {localSettings.missedStreakCount}
              </Text>
              <Text style={styles.motivationStatLabel}>Missed Streaks</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetMissedCounts}
          >
            <Text style={styles.resetButtonText}>Reset Motivation Tracking</Text>
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
    </SafeAreaView>
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
  focusStats: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
  },
  focusStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  focusStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  focusStatItem: {
    alignItems: 'center',
  },
  focusStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.warning,
    marginBottom: 4,
  },
  focusStatLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  motivationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  motivationStatItem: {
    alignItems: 'center',
  },
  motivationStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.danger,
    marginBottom: 4,
  },
  motivationStatLabel: {
    fontSize: 12,
    color: Colors.dark.subtext,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.danger,
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
});