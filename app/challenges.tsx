import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Trophy, ArrowLeft, Flame, Target, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useChallengeStore } from '@/store/challengeStore';
import ChallengeCard from '@/components/ChallengeCard';
import { useRouter } from 'expo-router';

export default function ChallengesScreen() {
  const router = useRouter();
  const { activeChallenges, startChallenge } = useChallengeStore();
  
  const handleStartChallenge = (challengeCode: '75_hard' | '30_day' | 'goggins_4x4x48') => {
    const challengeNames = {
      '75_hard': '75 Hard Challenge',
      '30_day': '30-Day Discipline Challenge',
      'goggins_4x4x48': 'Goggins 4x4x48 Challenge'
    };
    
    Alert.alert(
      'Start Challenge',
      `Are you ready to commit to the ${challengeNames[challengeCode]}? This requires serious dedication and mental toughness.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Challenge', 
          style: 'destructive',
          onPress: () => {
            startChallenge(challengeCode);
            Alert.alert(
              'Challenge Started!',
              'Your journey begins now. No excuses, no shortcuts. Time to prove what you\'re made of.',
              [{ text: 'Let\'s Go!', onPress: () => router.back() }]
            );
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{
          title: 'Challenges',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Trophy size={32} color={Colors.dark.primary} />
          <Text style={styles.headerTitle}>Mental Toughness Challenges</Text>
          <Text style={styles.headerSubtitle}>
            Push your limits. Build unbreakable discipline. Become unstoppable.
          </Text>
        </View>
        
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            {activeChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isActive={true}
                onContinue={() => {
                  // Navigate to challenge detail or continue
                  Alert.alert(
                    'Continue Challenge',
                    `Day ${challenge.dayIndex} of ${challenge.totalDays}. Ready to crush today's tasks?`,
                    [{ text: 'Let\'s Go!' }]
                  );
                }}
              />
            ))}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Challenges</Text>
          <Text style={styles.sectionDescription}>
            Choose your battle. Each challenge is designed to break your mental barriers and forge unshakeable discipline.
          </Text>
          
          <ChallengeCard
            challengeCode=\"75_hard\"
            onStart={() => handleStartChallenge('75_hard')}
          />
          
          <ChallengeCard
            challengeCode=\"30_day\"
            onStart={() => handleStartChallenge('30_day')}
          />
          
          <ChallengeCard
            challengeCode=\"goggins_4x4x48\"
            onStart={() => handleStartChallenge('goggins_4x4x48')}
          />
        </View>
        
        <View style={styles.warningSection}>
          <View style={styles.warningHeader}>
            <Flame size={20} color={Colors.dark.danger} />
            <Text style={styles.warningTitle}>Warning</Text>
          </View>
          <Text style={styles.warningText}>
            These challenges are designed to push you to your absolute limits. They require serious commitment, mental toughness, and physical preparation. Consult with a healthcare professional before starting any extreme challenge.
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
  backButton: {
    padding: 8,
    marginLeft: -8,
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
    marginBottom: 32,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 16,
    lineHeight: 20,
  },
  warningSection: {
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.danger,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.danger,
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
});