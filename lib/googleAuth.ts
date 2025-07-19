import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = Platform.select({
  web: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Replace with your web client ID
  ios: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Replace with your iOS client ID
  android: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Replace with your Android client ID
});

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'myapp',
  path: 'auth',
});

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

export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    // Create the auth request
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      state: 'google-auth',
      codeChallenge: await AuthSession.AuthRequest.createRandomCodeChallenge(),
    });

    // Prompt for authentication
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });

    if (result.type === 'success') {
      const { code } = result.params;
      
      if (!code) {
        return {
          success: false,
          error: 'No authorization code received from Google',
        };
      }

      // Exchange the code for tokens using Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data?.user) {
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
            avatar_url: data.user.user_metadata?.avatar_url,
          },
        };
      }

      return {
        success: false,
        error: 'No user data received from Google',
      };
    } else if (result.type === 'cancel') {
      return {
        success: false,
        error: 'Authentication was cancelled',
      };
    } else {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
};

// Alternative implementation using Supabase's built-in OAuth flow
export const signInWithGoogleSupabase = async (): Promise<GoogleAuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/auth/callback`
          : 'myapp://auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Supabase Google OAuth error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // For web, the redirect will handle the rest
    if (Platform.OS === 'web') {
      return {
        success: true,
      };
    }

    // For mobile, we need to handle the session
    if (data?.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
          avatar_url: data.user.user_metadata?.avatar_url,
        },
      };
    }

    return {
      success: false,
      error: 'Authentication completed but no user data received',
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
};