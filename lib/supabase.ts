import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase credentials
const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';

// Create the Supabase client
let supabase: SupabaseClient;

try {
  // Validate URL format
  new URL(supabaseUrl);
  
  // Create the Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'grind-app',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  
  console.log('Supabase client initialized successfully');
} catch (error) {
  // Handle invalid URL error
  console.error('Invalid Supabase URL:', error);
  
  // Create a mock client that shows an error for all operations
  const mockErrorHandler = () => ({
    error: {
      message: 'Supabase configuration error. Please check your credentials.',
    },
  });
  
  supabase = {
    auth: {
      signInWithPassword: mockErrorHandler,
      signUp: mockErrorHandler,
      signOut: mockErrorHandler,
      getSession: () => ({ data: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: mockErrorHandler,
      resend: mockErrorHandler,
    },
    from: () => ({
      select: () => ({
        eq: mockErrorHandler,
        single: mockErrorHandler,
      }),
      insert: mockErrorHandler,
      update: mockErrorHandler,
    }),
    storage: {
      from: () => ({
        upload: mockErrorHandler,
        getPublicUrl: mockErrorHandler,
      }),
      listBuckets: mockErrorHandler,
      createBucket: mockErrorHandler,
    },
    rpc: mockErrorHandler,
  } as unknown as SupabaseClient;
  
  // Log error in console only
  console.error('Supabase Configuration Error: Please check your URL and API key.');
}

// Helper function to check if database tables exist
export const checkDatabaseSetup = async (): Promise<{ isSetup: boolean; error?: string }> => {
  try {
    // Check if profiles table exists by trying to select from it
    const { error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!testError) {
      // Table exists and is accessible
      return { isSetup: true };
    }
    
    // Check if it's a table not found error
    if (testError.code === '42P01' || testError.message.includes('relation') || testError.message.includes('does not exist')) {
      return { 
        isSetup: false, 
        error: 'Database tables not found. Please run the database-setup.sql script in your Supabase SQL editor to create the required tables and policies.' 
      };
    }
    
    // Check for RLS policy errors
    if (testError.code === '42501' || testError.message.includes('permission denied') || testError.message.includes('policy')) {
      return { 
        isSetup: false, 
        error: 'Database tables exist but Row Level Security policies are not configured. Please run the complete database setup script.' 
      };
    }
    
    // Other error
    return { 
      isSetup: false, 
      error: `Database error: ${testError.message}` 
    };
  } catch (error) {
    console.error('Error checking database setup:', error);
    return { 
      isSetup: false, 
      error: `Failed to check database: ${error}` 
    };
  }
};

// Function to check database setup (directs users to manual setup)
export const setupDatabase = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await checkDatabaseSetup();
    if (result.isSetup) {
      return { success: true };
    }
    
    // Database is not set up, return error message directing to manual setup
    return { 
      success: false, 
      error: 'Database setup required. Please copy and run the complete database-setup.sql script in your Supabase SQL editor to create all required tables and policies.' 
    };
  } catch (error) {
    console.error('Error checking database setup:', error);
    return { 
      success: false, 
      error: 'Database setup required. Please copy and run the complete database-setup.sql script in your Supabase SQL editor.' 
    };
  }
};

// Helper function to ensure database is ready before operations
export const ensureDatabaseReady = async (): Promise<void> => {
  const result = await setupDatabase();
  if (!result.success) {
    throw new Error(result.error || 'Database not ready');
  }
};

// Legacy function for backward compatibility
export const setupDatabaseLegacy = async (): Promise<boolean> => {
  const result = await setupDatabase();
  if (!result.success && result.error) {
    console.error(result.error);
  }
  return result.success;
};

// Helper function to create user profile after signup
export const createUserProfile = async (userId: string, userData: { name?: string; avatar_url?: string } = {}) => {
  try {
    // First try using the RPC function which has better error handling
    const { data: rpcResult, error: rpcError } = await supabase.rpc('ensure_user_profile', {
      user_id: userId,
      user_name: userData.name || 'User'
    });
    
    if (!rpcError && rpcResult) {
      console.log('Profile ensured via RPC for user:', userId);
      return { data: { id: userId }, error: null };
    }
    
    // Fallback to direct insert if RPC fails
    const errorMessage = rpcError ? serializeError(rpcError) : 'Unknown RPC error';
    if (errorMessage.includes('Could not find the function') || 
        errorMessage.includes('function public.ensure_user_profile') ||
        errorMessage.includes('schema cache')) {
      console.log('Function not found in schema cache, using direct upsert:', errorMessage);
    } else {
      console.log('RPC failed with other error, trying direct upsert:', errorMessage);
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: userData.name || 'User',
        avatar_url: userData.avatar_url || null,
        level: 1,
        xp: 0,
        streak_days: 0,
        longest_streak: 0,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error.message);
      return { data: null, error };
    }

    console.log('User profile created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    return { data: null, error };
  }
};

// Helper function to check if user exists in auth.users table
export const checkUserExists = async (userId: string): Promise<{ exists: boolean; error?: string }> => {
  try {
    // Use RPC to check if user exists in auth.users
    const { data, error } = await supabase.rpc('check_user_exists', { user_id: userId });
    
    if (error) {
      console.error('Error checking user existence:', error);
      return { exists: false, error: error.message };
    }
    
    return { exists: data === true };
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    return { exists: false, error: serializeError(error) };
  }
};

// Helper function to get current authenticated user
export const getCurrentUser = async (): Promise<{ user: any | null; error?: string }> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    if (!user) {
      return { user: null, error: 'No authenticated user found' };
    }
    
    // Verify user exists in auth.users by checking if we can get their session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return { user: null, error: 'Invalid or expired session' };
    }
    
    return { user };
  } catch (error) {
    return { user: null, error: serializeError(error) };
  }
};

// Helper function to ensure user profile exists using RPC
export const ensureUserProfile = async (userId: string, userData: { name?: string; email?: string } = {}): Promise<{ success: boolean; error?: string }> => {
  try {
    // First check if user exists in auth.users
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      console.error('User not found in auth.users:', authError);
      return { success: false, error: 'User not authenticated or user ID mismatch' };
    }
    
    // Use the RPC function to ensure profile exists
    const userName = userData.name || userData.email?.split('@')[0] || user.user_metadata?.name || user.email || 'User';
    
    console.log('Ensuring profile exists for user:', userId, 'with name:', userName);
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('ensure_user_profile', {
      user_id: userId,
      user_name: userName
    });
    
    if (rpcError) {
      console.error('RPC error ensuring profile:', serializeError(rpcError));
      
      // Check if it's a function not found error
      const errorMessage = serializeError(rpcError);
      if (errorMessage.includes('Could not find the function') || 
          errorMessage.includes('function public.ensure_user_profile') ||
          errorMessage.includes('schema cache')) {
        console.log('Function not found in schema cache, using direct upsert...');
      } else {
        console.log('RPC failed with other error, falling back to direct upsert...');
      }
      
      const profileData = {
        id: userId,
        name: userName,
        level: 1,
        xp: 0,
        streak_days: 0,
        longest_streak: 0
      };
      
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });
      
      if (upsertError) {
        console.error('Error in fallback upsert:', serializeError(upsertError));
        return { success: false, error: `Database function not available. Please run the database setup script. Error: ${serializeError(upsertError)}` };
      }
      
      console.log('Profile ensured via fallback upsert');
      return { success: true };
    }
    
    if (!rpcResult) {
      console.error('User does not exist in auth.users table');
      return { success: false, error: 'User authentication error. Please sign out and sign in again.' };
    }
    
    console.log('Profile ensured successfully via RPC');
    return { success: true };
  } catch (error) {
    console.error('Error in ensureUserProfile:', error);
    return { success: false, error: serializeError(error) };
  }
};

// Helper function to serialize errors properly
export const serializeError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    if (error.message) {
      return error.message;
    }
    
    if (error.error_description) {
      return error.error_description;
    }
    
    if (error.details) {
      return error.details;
    }
    
    // Try to stringify the error object
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error occurred';
    }
  }
  
  return 'An unknown error occurred';
};

// Helper function to create demo users for Google authentication
export const createDemoGoogleUser = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    // Try multiple realistic demo emails
    const demoEmails = [
      'demo.user@gmail.com',
      'testuser@gmail.com', 
      'google.demo@gmail.com',
      'demo.google@gmail.com'
    ];
    const demoPassword = 'DemoPassword123!';
    
    // Try each demo email
    for (const demoEmail of demoEmails) {
      try {
        // First try to sign in if user already exists
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (!signInError && signInData.user) {
          console.log('Successfully signed in with existing demo user:', demoEmail);
          return { 
            success: true, 
            user: signInData.user,
            error: 'Demo user already exists and was signed in successfully'
          };
        }

        // If sign-in failed, try to create the user
        const { data, error } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: {
              full_name: 'Demo Google User',
              avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
              provider: 'google'
            }
          }
        });

        if (!error && data?.user) {
          console.log('Successfully created demo user:', demoEmail);
          return { 
            success: true, 
            user: data.user,
            error: 'Demo user created successfully'
          };
        }

        // Log the error and try next email
        console.log(`Failed to create/sign-in with ${demoEmail}:`, error?.message);
      } catch (emailError) {
        console.log(`Error with ${demoEmail}:`, emailError);
        continue;
      }
    }

    // If all emails failed, return helpful error
    return { 
      success: false, 
      error: `Failed to create demo user with any email. This usually means email confirmation is required in Supabase settings.` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: `Error creating demo user: ${serializeError(error)}` 
    };
  }
};

export { supabase };