import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '622264444043-2b05dht1p0kfnijpkjjgu1h60sncflba.apps.googleusercontent.com';

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

// Create the auth request configuration
const createAuthRequest = () => {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'grind',
    path: 'auth/callback',
  });

  console.log('Google OAuth redirect URI:', redirectUri);

  return {
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    additionalParameters: {},
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
  };
};

// Main Google sign-in function
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    console.log('Starting Google OAuth flow...');
    
    // Create auth request
    const authRequestConfig = createAuthRequest();
    const request = new AuthSession.AuthRequest(authRequestConfig);
    
    // Discover auth endpoints
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };
    
    console.log('Prompting for auth...');
    
    // Prompt for authentication
    const result = await request.promptAsync(discovery);
    
    console.log('Auth result:', result.type);
    
    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        return {
          success: false,
          error: 'Authentication was cancelled by the user.',
        };
      }
      return {
        success: false,
        error: `Authentication failed: ${result.type}`,
      };
    }
    
    if (!result.params?.code) {
      return {
        success: false,
        error: 'No authorization code received from Google.',
      };
    }
    
    console.log('Exchanging code for session with Supabase...');
    
    // Exchange the code for a session with Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(result.params.code);
    
    if (error) {
      console.error('Supabase code exchange error:', error);
      return {
        success: false,
        error: `Failed to authenticate with Google: ${error.message}`,
      };
    }
    
    if (!data?.user) {
      return {
        success: false,
        error: 'No user data received from Google authentication.',
      };
    }
    
    console.log('Google authentication successful for user:', data.user.email);
    
    // Extract user information
    const user = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
      avatar_url: data.user.user_metadata?.avatar_url,
    };
    
    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'An unexpected error occurred during Google authentication.';
    
    if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
      errorMessage = 'Authentication was cancelled.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Alias for backward compatibility
export const signInWithGoogleSupabase = signInWithGoogle;