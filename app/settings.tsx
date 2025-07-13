import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert,
  Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Bell, 
  Shield, 
  HelpCircle,
  ChevronRight,
  LogOut,
  Trash2,
  Target
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useGoalStore } from '@/store/goalStore';
import { useTaskStore } from '@/store/taskStore';
import { useJournalStore } from '@/store/journalStore';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { supabase, serializeError } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { goals, resetGoals, setOnboarded } = useGoalStore();
  const { profile, fetchProfile } = useUserStore();
  const { user, logout } = useAuthStore();
  
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch profile data when the screen loads
  useEffect(() => {
    fetchProfile();
  }, []);
  
  // Fetch avatar URL
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
            
          if (error) {
            if (error.code !== 'PGRST116') { // Not found is okay
              console.error("Error fetching avatar in settings:", serializeError(error));
            }
          } else if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } catch (error) {
          console.error("Error fetching avatar:", serializeError(error));
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchAvatar();
  }, [user]);
  
  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => logout()
        }
      ]
    );
  };
  
  const handleResetApp = () => {
    Alert.alert(
      "Reset App",
      "Are you sure you want to reset the app? This will delete all your data and return to the onboarding screen.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetGoals();
            setOnboarded(false);
            router.replace('/onboarding');
          }
        }
      ]
    );
  };
  
  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    subtitle?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIconContainer}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: "Settings",
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView}>
          {/* Profile Header */}
          <TouchableOpacity 
            style={styles.profileHeader}
            onPress={() => router.push('/profile/edit')}
          >
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarPlaceholder}>
                  {profile.name.charAt(0).toUpperCase() || "U"}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.subtext} />
          </TouchableOpacity>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            {renderSettingItem(
              <User size={20} color={Colors.dark.primary} />,
              "Edit Profile",
              "Change your name and profile picture",
              <ChevronRight size={20} color={Colors.dark.subtext} />,
              () => router.push('/profile/edit')
            )}
            {renderSettingItem(
              <Bell size={20} color={Colors.dark.primary} />,
              "Notifications",
              notificationsEnabled ? "Enabled" : "Disabled",
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.dark.inactive, true: Colors.dark.primary }}
                thumbColor={Colors.dark.text}
              />
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage Ultimate Goals</Text>
            {goals.map((goal, index) => (
              renderSettingItem(
                <Target size={20} color={Colors.dark.primary} />,
                `Goal ${index + 1}: ${goal.title}`,
                `Deadline: ${goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline set'}`,
                <ChevronRight size={20} color={Colors.dark.subtext} />,
                () => router.push({
                  pathname: '/goals/edit',
                  params: { id: goal.id }
                })
              )
            ))}
            
            {goals.length < 3 && (
              renderSettingItem(
                <Target size={20} color={Colors.dark.primary} />,
                "Add New Goal",
                "You can have up to 3 goals",
                <ChevronRight size={20} color={Colors.dark.subtext} />,
                () => router.push('/goals/create')
              )
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
            {renderSettingItem(
              <Shield size={20} color={Colors.dark.primary} />,
              "Privacy Policy",
              "Read our privacy policy",
              <ChevronRight size={20} color={Colors.dark.subtext} />,
              () => {}
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {renderSettingItem(
              <HelpCircle size={20} color={Colors.dark.primary} />,
              "Help & FAQ",
              "Get help with Grind",
              <ChevronRight size={20} color={Colors.dark.subtext} />,
              () => {}
            )}
          </View>
          
          <View style={styles.dangerSection}>
            {renderSettingItem(
              <LogOut size={20} color={Colors.dark.danger} />,
              "Log Out",
              "Sign out of your account",
              <ChevronRight size={20} color={Colors.dark.danger} />,
              handleLogout
            )}
            
            {renderSettingItem(
              <Trash2 size={20} color={Colors.dark.danger} />,
              "Reset App",
              "Delete all data and start over",
              <ChevronRight size={20} color={Colors.dark.danger} />,
              handleResetApp
            )}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.versionText}>Grind v1.0.0</Text>
          </View>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginTop: 2,
  },
  dangerSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  versionText: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
});