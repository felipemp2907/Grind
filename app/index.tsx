import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useGoalStore } from '@/store/goalStore';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isOnboarded } = useGoalStore();

  useEffect(() => {
    if (isLoading) return;
    
    console.log('TRPC_URL', process.env.EXPO_PUBLIC_API_URL + '/api/trpc');
    console.log('SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    
    if (!isAuthenticated) {
      router.replace('/welcome');
    } else if (isOnboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isOnboarded, isLoading, router]);

  return null;
}