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
        error: 'Database tables not found. Please run the database-setup.sql in your Supabase SQL editor.' 
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

// Function to set up database programmatically
export const setupDatabase = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await checkDatabaseSetup();
    if (result.isSetup) {
      return { success: true };
    }
    
    console.log('Setting up database tables...');
    
    // Create profiles table
    const { error: profilesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT,
          avatar_url TEXT,
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          streak_days INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
        CREATE POLICY "Users can view their own profile"
          ON public.profiles
          FOR SELECT
          USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        CREATE POLICY "Users can update their own profile"
          ON public.profiles
          FOR UPDATE
          USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        CREATE POLICY "Users can insert their own profile"
          ON public.profiles
          FOR INSERT
          WITH CHECK (auth.uid() = id);
      `
    });
    
    if (profilesError) {
      console.error('Error creating profiles table:', profilesError);
      // Try alternative approach - just create the table without RPC
      try {
        // Check if we can at least insert into profiles table
        const { error: insertTestError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (insertTestError && insertTestError.code === '42P01') {
          return { 
            success: false, 
            error: 'Database tables not found. Please run the database-setup.sql in your Supabase SQL editor.' 
          };
        }
      } catch (e) {
        return { 
          success: false, 
          error: 'Database tables not found. Please run the database-setup.sql in your Supabase SQL editor.' 
        };
      }
    }
    
    // Verify setup worked
    const verifyResult = await checkDatabaseSetup();
    if (verifyResult.isSetup) {
      console.log('Database setup completed successfully');
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Database tables not found. Please run the database-setup.sql in your Supabase SQL editor.' 
      };
    }
  } catch (error) {
    console.error('Error in setupDatabase:', error);
    return { 
      success: false, 
      error: 'Database tables not found. Please run the database-setup.sql in your Supabase SQL editor.' 
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
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: userData.name || null,
        avatar_url: userData.avatar_url || null,
        level: 1,
        xp: 0,
        streak_days: 0,
        longest_streak: 0,
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

export { supabase };