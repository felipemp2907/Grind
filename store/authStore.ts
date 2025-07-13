import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase, createUserProfile, serializeError } from '@/lib/supabase';
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
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
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
            
            // Create user profile (this will be handled by the database trigger)
            // But we can also try to create it manually as a fallback
            try {
              await createUserProfile(data.user.id, { name });
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
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Session refresh error:", serializeError(error));
            return;
          }
          
          if (data?.session) {
            const { user } = data.session;
            
            set({
              user: {
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || 'User',
              },
              session: data.session,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          console.error("Session refresh error:", serializeError(error));
        }
      },
      
      clearError: () => {
        set({ error: null });
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