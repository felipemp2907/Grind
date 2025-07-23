import { Platform } from 'react-native';
import { supabase, createDemoGoogleUser } from './supabase';

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
    console.log('🔧 Using mock Google authentication for development');
    
    // First, try to sign in with pre-created demo users that should already be confirmed
    const knownDemoUsers = [
      'demo.user@gmail.com',
      'testuser@gmail.com',
      'google.demo@gmail.com',
      'demo.google@gmail.com'
    ];
    
    const demoPassword = 'DemoPassword123!';
    
    // Try each known demo user
    for (const demoEmail of knownDemoUsers) {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (!signInError && signInData.user) {
          console.log('🔧 Successfully signed in with existing demo user:', demoEmail);
          return {
            success: true,
            user: {
              id: signInData.user.id,
              email: signInData.user.email || demoEmail,
              name: signInData.user.user_metadata?.full_name || 'Demo Google User',
              avatar_url: signInData.user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
            },
          };
        }
      } catch (err) {
        // Continue to next demo user
        console.log('Demo user', demoEmail, 'not available, trying next...');
      }
    }

    // If no existing demo users work, try to create one
    console.log('🔧 No existing demo users available, attempting to create one...');
    
    const createResult = await createDemoGoogleUser();
    
    if (createResult.success && createResult.user) {
      console.log('🔧 Demo user created successfully');
      return {
        success: true,
        user: {
          id: createResult.user.id,
          email: createResult.user.email || 'demo.user@gmail.com',
          name: createResult.user.user_metadata?.full_name || 'Demo Google User',
          avatar_url: createResult.user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        },
      };
    }
    
    // If creation failed, provide clear instructions
    return {
      success: false,
      error: `Demo Google Authentication Setup Required\n\n${createResult.error || 'Failed to create demo user'}\n\nTo fix this:\n\n1. Go to your Supabase Dashboard\n2. Navigate to Authentication > Settings\n3. Turn OFF "Enable email confirmations"\n4. Try Google sign-in again\n\nOR\n\nCreate a demo user manually:\n1. Use regular registration with:\n   Email: demo.user@gmail.com\n   Password: DemoPassword123!\n2. Then use Google sign-in\n\nAlternatively, use regular email/password authentication.`,
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Provide helpful error messages for common issues
    if (error.message?.includes('Email not confirmed') || error.message?.includes('confirmation')) {
      return {
        success: false,
        error: 'Email confirmation is required. To fix this:\n\n1. Go to your Supabase Dashboard\n2. Navigate to Authentication > Settings\n3. Turn OFF "Enable email confirmations"\n4. Try again\n\nAlternatively, use regular email/password authentication.',
      };
    }
    
    return {
      success: false,
      error: `Demo authentication error: ${error.message || 'An unexpected error occurred'}\n\nThis is a development demo. Please try regular email/password authentication instead.`,
    };
  }
};

// Alias for backward compatibility
export const signInWithGoogleSupabase = signInWithGoogle;