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
    // Use a fixed demo user to avoid email validation issues
    // This simulates a real Google OAuth flow
    const mockGoogleUser = {
      email: 'demo@grindapp.com',
      password: 'DemoPassword123!',
      name: 'Demo Google User',
      avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
    };

    console.log('🔧 Using mock Google authentication for development');
    console.log('🔧 Mock user email:', mockGoogleUser.email);

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: mockGoogleUser.email,
      password: mockGoogleUser.password,
    });

    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create them
      console.log('🔧 Creating new mock Google user...');
      
      // First try with email confirmation disabled for demo
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: mockGoogleUser.email,
        password: mockGoogleUser.password,
        options: {
          data: {
            full_name: mockGoogleUser.name,
            avatar_url: mockGoogleUser.avatar_url,
            provider: 'google'
          },
          emailRedirectTo: undefined // Disable email confirmation for demo
        }
      });

      if (signUpError) {
        console.error('Mock Google sign-up error:', signUpError);
        
        // If email validation fails, try with a different approach
        if (signUpError.message.includes('invalid') || signUpError.message.includes('email')) {
          console.log('🔧 Email validation failed, trying alternative approach...');
          
          // Try with a more standard email format
          const altEmail = `demouser${Date.now()}@gmail.com`;
          const { data: altSignUpData, error: altSignUpError } = await supabase.auth.signUp({
            email: altEmail,
            password: mockGoogleUser.password,
            options: {
              data: {
                full_name: mockGoogleUser.name,
                avatar_url: mockGoogleUser.avatar_url,
                provider: 'google'
              }
            }
          });
          
          if (altSignUpError) {
            return {
              success: false,
              error: `Demo authentication failed: ${altSignUpError.message}. This is a development demo - in production, real Google OAuth would be used.`,
            };
          }
          
          if (altSignUpData.user) {
            console.log('🔧 Alternative mock Google user created successfully');
            return {
              success: true,
              user: {
                id: altSignUpData.user.id,
                email: altSignUpData.user.email || altEmail,
                name: mockGoogleUser.name,
                avatar_url: mockGoogleUser.avatar_url,
              },
            };
          }
        }
        
        return {
          success: false,
          error: `Demo sign-up failed: ${signUpError.message}. This is a development demo.`,
        };
      }

      if (signUpData.user) {
        console.log('🔧 Mock Google user created successfully');
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
        error: `Demo sign-in failed: ${signInError.message}. This is a development demo.`,
      };
    }

    if (signInData.user) {
      console.log('🔧 Mock Google user signed in successfully');
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
      error: 'Demo authentication failed - no user data received',
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: `Demo authentication error: ${error.message || 'An unexpected error occurred'}. This is a development demo.`,
    };
  }
};

// Alias for backward compatibility
export const signInWithGoogleSupabase = signInWithGoogle;