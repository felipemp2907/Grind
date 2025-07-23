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
    console.log('🔧 Using mock Google authentication for development');
    
    // Try to sign in with a pre-created demo user first
    const knownDemoUsers = [
      'demo@grindapp.com',
      'testuser@grindapp.com',
      'google.demo@grindapp.com'
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

    // If no existing demo users work, try to create a new one
    console.log('🔧 No existing demo users available, creating new one...');
    
    const timestamp = Date.now();
    const newDemoUser = {
      email: `demo.user.${timestamp}@gmail.com`,
      password: demoPassword,
      name: 'Demo Google User',
      avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
    };

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newDemoUser.email,
      password: newDemoUser.password,
      options: {
        data: {
          full_name: newDemoUser.name,
          avatar_url: newDemoUser.avatar_url,
          provider: 'google'
        }
      }
    });

    if (signUpError) {
      console.error('Demo user creation failed:', signUpError);
      
      // Provide specific error messages for common issues
      if (signUpError.message.includes('Email not confirmed') || 
          signUpError.message.includes('confirmation')) {
        return {
          success: false,
          error: 'Email confirmation is required in your Supabase project. To fix this:\n\n1. Go to your Supabase Dashboard\n2. Navigate to Authentication > Settings\n3. Turn OFF "Enable email confirmations"\n4. Try again\n\nAlternatively, you can use regular email/password registration.',
        };
      }
      
      if (signUpError.message.includes('invalid') && signUpError.message.includes('email')) {
        return {
          success: false,
          error: 'Email validation failed. This is a demo authentication - please try regular email/password login instead.',
        };
      }
      
      return {
        success: false,
        error: `Demo authentication setup failed: ${signUpError.message}\n\nThis is a development demo. In production, real Google OAuth would be used. You can try regular email/password authentication instead.`,
      };
    }

    if (signUpData?.user) {
      // Check if user needs email confirmation
      if (!signUpData.session) {
        return {
          success: false,
          error: 'Email confirmation is required. To fix this:\n\n1. Go to your Supabase Dashboard\n2. Navigate to Authentication > Settings\n3. Turn OFF "Enable email confirmations"\n4. Try again\n\nAlternatively, you can use regular email/password registration.',
        };
      }

      console.log('🔧 New demo user created successfully');
      return {
        success: true,
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email || newDemoUser.email,
          name: newDemoUser.name,
          avatar_url: newDemoUser.avatar_url,
        },
      };
    }

    return {
      success: false,
      error: 'Demo authentication failed to create user. Please try regular email/password authentication instead.',
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Provide helpful error messages for common issues
    if (error.message?.includes('Email not confirmed') || error.message?.includes('confirmation')) {
      return {
        success: false,
        error: 'Email confirmation is required. Please disable email confirmation in Supabase Auth settings for development, or use regular email/password authentication.',
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