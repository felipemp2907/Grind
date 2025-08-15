import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    
    console.log('TRPC_URL', (process.env.EXPO_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')) + '/api/trpc');
    console.log('SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    
    if (session) {
      router.replace('/(tabs)/home' as any);
    } else {
      router.replace('/welcome');
    }
  }, [session, isLoading, router]);

  return null;
}