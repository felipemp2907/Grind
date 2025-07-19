import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, createUserProfile } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshSession } = useAuthStore();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the current session after OAuth redirect
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/login?error=auth_failed');
        return;
      }

      if (session?.user) {
        // Ensure user profile exists
        try {
          await createUserProfile(session.user.id, {
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  'User',
            avatar_url: session.user.user_metadata?.avatar_url
          });
        } catch (profileError) {
          console.error('Error creating profile after OAuth:', profileError);
        }

        // Refresh the auth store session
        await refreshSession();
        
        // Redirect to main app
        router.replace('/(tabs)');
      } else {
        // No session found, redirect to login
        router.replace('/login?error=no_session');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      router.replace('/login?error=callback_failed');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  text: {
    color: Colors.dark.text,
    fontSize: 16,
    marginTop: 16,
  },
});