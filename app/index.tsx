import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

export default function Index() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after a brief delay to ensure navigation is ready
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;
    
    console.log('Index: Navigating based on auth state', { session: !!session, isLoading });
    
    // Add a small delay to ensure the navigation system is ready
    const navigationTimer = setTimeout(() => {
      try {
        if (session) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/welcome');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback - try again after a longer delay
        setTimeout(() => {
          try {
            if (session) {
              router.replace('/(tabs)/home');
            } else {
              router.replace('/welcome');
            }
          } catch (fallbackError) {
            console.error('Fallback navigation error:', fallbackError);
          }
        }, 500);
      }
    }, 50);
    
    return () => clearTimeout(navigationTimer);
  }, [session, isLoading, router, isMounted]);

  // Show a loading indicator while initializing
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: Colors.dark.background 
    }}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
}