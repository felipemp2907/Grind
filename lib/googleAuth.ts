import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
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
    // Create code challenge for PKCE
    const codeChallenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(36).substring(2, 15),
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Create the auth request
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID!,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      state: 'google-auth',
      codeChallenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
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

      // For now, we'll use the simpler Supabase OAuth flow
      return await signInWithGoogleSupabase();
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

// Main implementation using Supabase's built-in OAuth flow
export const signInWithGoogleSupabase = async (): Promise<GoogleAuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: Platform.OS === 'web' 
          ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
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

    // For mobile, check if we have a session after OAuth
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData?.session?.user) {
      const user = sessionData.session.user;
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatar_url: user.user_metadata?.avatar_url,
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