import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase, createUserProfile, serializeError } from '@/lib/supabase';
import { signInWithGoogleSupabase } from '@/lib/googleAuth';
import { AuthUser, LoginCredentials, RegisterCredentials } from '@/types';
import { AuthError, Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  session: Session | null;
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      session: null,
      
      login: async ({ email, password }: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) {
            // Handle email not confirmed error specifically
            if (error.message.includes('Email not confirmed') || error.message.includes('not been confirmed')) {
              throw new Error('Your email has not been confirmed. Please check your inbox and spam folder for the confirmation email, or use the "Resend Confirmation" option.');
            }
            throw error;
          }
          
          if (data?.user) {
            // Ensure user profile exists on login
            try {
              const profileResult = await createUserProfile(data.user.id, { 
                name: data.user.user_metadata?.name 
              });
              if (profileResult.error) {
                console.log('Profile creation failed during login, trying RPC fallback');
                await supabase.rpc('ensure_user_profile', {
                  user_id: data.user.id,
                  user_name: data.user.user_metadata?.name || 'User'
                });
              }
            } catch (profileError) {
              console.error('Error ensuring profile on login:', serializeError(profileError));
            }
            
            const user: AuthUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name || 'User',
            };
            
            set({ 
              user,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
            });
            
            router.replace('/(tabs)');
          }
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Login error:", errorMessage);
          set({ 
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await signInWithGoogleSupabase();
          
          if (!result.success) {
            // If the mock Google auth fails, provide a helpful error message
            const errorMessage = result.error || 'Google authentication failed';
            console.error("Google login error:", errorMessage);
            
            // Show the specific error message from the Google auth function
            Alert.alert(
              "Demo Google Authentication",
              errorMessage,
              [
                { text: 'Use Email/Password', onPress: () => {
                  // User can continue with regular login
                }},
                { text: 'OK', style: 'default' }
              ]
            );
            
            set({ 
              error: null, // Don't show the technical error to user
              isLoading: false,
            });
            return;
          }

          // For web, the redirect will handle the session
          if (Platform.OS === 'web') {
            set({ isLoading: false });
            return;
          }

          // For mobile, handle the user data
          if (result.user) {
            // Ensure user profile exists
            try {
              const profileResult = await createUserProfile(result.user.id, { 
                name: result.user.name,
                avatar_url: result.user.avatar_url
              });
              if (profileResult.error) {
                console.log('Profile creation failed during Google login, trying RPC fallback');
                await supabase.rpc('ensure_user_profile', {
                  user_id: result.user.id,
                  user_name: result.user.name
                });
              }
            } catch (profileError) {
              console.error('Error ensuring profile on Google login:', serializeError(profileError));
              // Continue with login even if profile creation fails
            }
            
            const user: AuthUser = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
            };
            
            // Get the current session
            const { data: sessionData } = await supabase.auth.getSession();
            
            set({ 
              user,
              session: sessionData.session,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Show success message for demo
            Alert.alert(
              "Demo Login Successful",
              "You've been signed in with a demo Google account for testing purposes. In production, this would use real Google OAuth.",
              [{ text: 'OK' }]
            );
            
            router.replace('/(tabs)');
          } else {
            set({ isLoading: false });
          }
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Google login error:", errorMessage);
          
          // Show user-friendly error for demo
          Alert.alert(
            "Demo Google Authentication Error",
            `${errorMessage}\n\nThis is a development demo. In production, real Google OAuth would be used. You can try regular email/password login instead.`,
            [{ text: 'OK' }]
          );
          
          set({ 
            error: null, // Don't show technical error to user
            isLoading: false,
          });
        }
      },
      
      register: async ({ email, password, name }: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // Determine the appropriate redirect URL based on platform
          const redirectUrl = Platform.OS === 'web' 
            ? `${window.location.origin}/login` 
            : 'grind://login';
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
              },
              emailRedirectTo: redirectUrl,
            },
          });
          
          if (error) throw error;
          
          if (data?.user) {
            // Check if email confirmation is required
            if (data.session === null) {
              set({ isLoading: false });
              Alert.alert(
                "Registration Successful",
                "We've sent a confirmation email to your address. Please check your inbox and spam folder, then confirm your email before logging in.",
                [{ text: 'OK' }]
              );
              router.replace('/login');
              return;
            }
            
            const user: AuthUser = {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name || name,
            };
            
            set({ 
              user,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Ensure user profile is created
            // The database trigger should handle this, but we'll ensure it exists
            try {
              const profileResult = await createUserProfile(data.user.id, { name });
              if (profileResult.error) {
                console.error('Error creating profile:', profileResult.error);
                // Try using the RPC function as fallback
                const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
                  user_id: data.user.id,
                  user_name: name
                });
                if (rpcError) {
                  console.error('RPC profile creation also failed:', rpcError);
                }
              }
            } catch (profileError) {
              console.error('Error creating profile:', serializeError(profileError));
              // Continue with navigation even if profile creation fails
              // The profile should be created by the database trigger
            }
            
            router.replace('/onboarding');
          }
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Registration error:", errorMessage);
          set({ 
            error: errorMessage,
            isLoading: false,
          });
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          
          set({ 
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          router.replace('/login');
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Logout error:", errorMessage);
          set({ 
            error: errorMessage,
            isLoading: false,
          });
        }
      },
      
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Determine the appropriate redirect URL based on platform
          const redirectUrl = Platform.OS === 'web' 
            ? `${window.location.origin}/reset-password` 
            : 'grind://reset-password';
          
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
          });
          
          if (error) throw error;
          
          set({ isLoading: false });
          Alert.alert(
            "Password Reset Email Sent",
            "Check your email for a password reset link."
          );
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Password reset error:", errorMessage);
          set({ 
            error: errorMessage,
            isLoading: false,
          });
        }
      },
      
      resendConfirmationEmail: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Determine the appropriate redirect URL based on platform
          const redirectUrl = Platform.OS === 'web' 
            ? `${window.location.origin}/login` 
            : 'grind://login';
          
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: redirectUrl,
            },
          });
          
          if (error) throw error;
          
          set({ isLoading: false });
          Alert.alert(
            "Confirmation Email Sent",
            "We've sent a new confirmation email to your address. Please check your inbox and spam folder."
          );
        } catch (error: any) {
          const errorMessage = serializeError(error);
          console.error("Resend confirmation error:", errorMessage);
          set({ 
            error: errorMessage,
            isLoading: false,
          });
        }
      },
      
      refreshSession: async () => {
        const currentState = get();
        
        // Prevent multiple simultaneous refresh attempts
        if (currentState.isLoading) {
          console.log('Session refresh already in progress, skipping');
          return;
        }
        
        set({ isLoading: true });
        
        try {
          console.log('Refreshing session...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Session refresh error:", serializeError(error));
            // Clear invalid session and stop loading
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            return;
          }
          
          if (data?.session) {
            const { user } = data.session;
            console.log('Session refreshed successfully for user:', user.id);
            
            set({
              user: {
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || 'User',
              },
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            console.log('No session found during refresh');
            // No session found, clear auth state and stop loading
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
          }
        } catch (error) {
          console.error("Session refresh error:", serializeError(error));
          // Clear auth state on error and stop loading
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      resetAuth: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },
    }),
    {
      name: 'grind-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        session: state.session,
      }),
    }
  )
);