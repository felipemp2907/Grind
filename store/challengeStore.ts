import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Challenge, ChallengeProgress } from '@/types';

interface ChallengeState {
  challenges: Challenge[];
  progress: ChallengeProgress[];
  activeChallenges: Challenge[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startChallenge: (challengeCode: '75_hard' | '30_day' | 'goggins_4x4x48') => void;
  completeDay: (challengeId: string, dayIndex: number, notes?: string) => void;
  abandonChallenge: (challengeId: string) => void;
  getChallengeProgress: (challengeId: string) => ChallengeProgress[];
  getActiveChallenges: () => Challenge[];
}

const CHALLENGE_TEMPLATES = {
  '75_hard': {
    title: '75 Hard Challenge',
    description: 'The ultimate mental toughness challenge. No excuses, no substitutions, no cheat meals.',
    totalDays: 75,
    rules: [
      'Follow a diet (no cheat meals or alcohol)',
      'Work out twice a day for at least 45 minutes each',
      'Drink 1 gallon of water',
      'Read 10 pages of a non-fiction book',
      'Take a progress photo'
    ],
    dailyTasks: [
      'Morning workout (45+ min)',
      'Evening workout (45+ min)',
      'Drink 1 gallon of water',
      'Read 10 pages non-fiction',
      'Take progress photo',
      'Follow diet strictly'
    ]
  },
  '30_day': {
    title: '30-Day Discipline Challenge',
    description: 'Build unbreakable discipline in 30 days through consistent daily actions.',
    totalDays: 30,
    rules: [
      'Wake up at 5 AM every day',
      'Complete a 30-minute workout',
      'No social media for entertainment',
      'Read for 30 minutes',
      'Cold shower every morning'
    ],
    dailyTasks: [
      'Wake up at 5 AM',
      '30-minute workout',
      'Cold shower',
      'Read for 30 minutes',
      'No entertainment social media'
    ]
  },
  'goggins_4x4x48': {
    title: 'Goggins 4x4x48 Challenge',
    description: 'Run 4 miles every 4 hours for 48 hours straight. Mental toughness at its peak.',
    totalDays: 2,
    rules: [
      'Run 4 miles every 4 hours',
      'No sleep for 48 hours',
      'Stay hydrated and fueled',
      'Document the journey',
      'Push through mental barriers'
    ],
    dailyTasks: [
      'Run #1 (4 miles)',
      'Run #2 (4 miles)',
      'Run #3 (4 miles)',
      'Run #4 (4 miles)',
      'Run #5 (4 miles)',
      'Run #6 (4 miles)'
    ]
  }
};

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set, get) => ({
      challenges: [],
      progress: [],
      activeChallenges: [],
      isLoading: false,
      error: null,
      
      startChallenge: (challengeCode) => {
        const template = CHALLENGE_TEMPLATES[challengeCode];
        if (!template) return;
        
        const newChallenge: Challenge = {
          id: `challenge-${Date.now()}`,
          code: challengeCode,
          title: template.title,
          description: template.description,
          dayIndex: 1,
          totalDays: template.totalDays,
          completed: false,
          startedAt: new Date().toISOString(),
          rules: template.rules,
          dailyTasks: template.dailyTasks
        };
        
        set(state => ({
          challenges: [...state.challenges, newChallenge],
          activeChallenges: [...state.activeChallenges, newChallenge]
        }));
      },
      
      completeDay: (challengeId, dayIndex, notes) => {
        const newProgress: ChallengeProgress = {
          challengeId,
          dayIndex,
          completed: true,
          completedAt: new Date().toISOString(),
          proofSubmitted: true,
          notes
        };
        
        set(state => {
          const updatedProgress = [...state.progress, newProgress];
          const updatedChallenges = state.challenges.map(challenge => {
            if (challenge.id === challengeId) {
              const newDayIndex = dayIndex + 1;
              const isCompleted = newDayIndex > challenge.totalDays;
              
              return {
                ...challenge,
                dayIndex: newDayIndex,
                completed: isCompleted,
                completedAt: isCompleted ? new Date().toISOString() : undefined
              };
            }
            return challenge;
          });
          
          const updatedActiveChallenges = updatedChallenges.filter(c => !c.completed);
          
          return {
            progress: updatedProgress,
            challenges: updatedChallenges,
            activeChallenges: updatedActiveChallenges
          };
        });
      },
      
      abandonChallenge: (challengeId) => {
        set(state => ({
          activeChallenges: state.activeChallenges.filter(c => c.id !== challengeId),
          challenges: state.challenges.map(c => 
            c.id === challengeId 
              ? { ...c, completed: true, completedAt: new Date().toISOString() }
              : c
          )
        }));
      },
      
      getChallengeProgress: (challengeId) => {
        return get().progress.filter(p => p.challengeId === challengeId);
      },
      
      getActiveChallenges: () => {
        return get().activeChallenges;
      }
    }),
    {
      name: 'grind-challenge-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);