import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

// Mock Google authentication for development
// In production, you would need to configure Google OAuth in Supabase
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    // For development, create a mock Google user and sign them in with email/password
    const mockGoogleUser = {
      email: 'google.user@example.com',
      password: 'google123',
      name: 'Google User',
      avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
    };

    console.log('🔧 Using mock Google authentication for development');

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: mockGoogleUser.email,
      password: mockGoogleUser.password,
    });

    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create them
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: mockGoogleUser.email,
        password: mockGoogleUser.password,
        options: {
          data: {
            full_name: mockGoogleUser.name,
            avatar_url: mockGoogleUser.avatar_url,
            provider: 'google'
          }
        }
      });

      if (signUpError) {
        console.error('Mock Google sign-up error:', signUpError);
        return {
          success: false,
          error: signUpError.message,
        };
      }

      if (signUpData.user) {
        return {
          success: true,
          user: {
            id: signUpData.user.id,
            email: signUpData.user.email || mockGoogleUser.email,
            name: mockGoogleUser.name,
            avatar_url: mockGoogleUser.avatar_url,
          },
        };
      }
    } else if (signInError) {
      console.error('Mock Google sign-in error:', signInError);
      return {
        success: false,
        error: signInError.message,
      };
    }

    if (signInData.user) {
      return {
        success: true,
        user: {
          id: signInData.user.id,
          email: signInData.user.email || mockGoogleUser.email,
          name: signInData.user.user_metadata?.full_name || mockGoogleUser.name,
          avatar_url: signInData.user.user_metadata?.avatar_url || mockGoogleUser.avatar_url,
        },
      };
    }

    return {
      success: false,
      error: 'Authentication failed',
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
};

// Alias for backward compatibility
export const signInWithGoogleSupabase = signInWithGoogle;