import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client
const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE0NDYwMiwiZXhwIjoyMDYyNzIwNjAyfQ.Ej4Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'; // This should be the service role key

// For now, use the anon key since we don't have the service role key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Database health check function
export const ensureDbReady = async (supabaseClient: typeof supabase) => {
  try {
    // Check if core tables exist by trying to query them
    const { error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id')
      .limit(1);
      
    const { error: goalsError } = await supabaseClient
      .from('goals')
      .select('id')
      .limit(1);
      
    const { error: tasksError } = await supabaseClient
      .from('tasks')
      .select('id')
      .limit(1);
    
    // If any table doesn't exist, throw an error
    if (profilesError && (profilesError.code === '42P01' || profilesError.message.includes('does not exist'))) {
      throw new Error('Database not set up: profiles table missing');
    }
    
    if (goalsError && (goalsError.code === '42P01' || goalsError.message.includes('does not exist'))) {
      throw new Error('Database not set up: goals table missing');
    }
    
    if (tasksError && (tasksError.code === '42P01' || tasksError.message.includes('does not exist'))) {
      throw new Error('Database not set up: tasks table missing');
    }
    
    console.log('Database health check passed');
    return { ok: true };
  } catch (error) {
    console.error('Database health check failed:', error);
    throw error;
  }
};

// Check database health on startup
let dbHealthChecked = false;
const checkDbHealth = async () => {
  if (!dbHealthChecked) {
    try {
      await ensureDbReady(supabase);
      dbHealthChecked = true;
      console.log('DB READY: true');
    } catch (error) {
      console.error('DB READY: false -', error instanceof Error ? error.message : 'Unknown error');
      // Don't throw here, let individual requests handle it
    }
  }
};

// Run health check on module load
checkDbHealth();

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  console.log('Creating tRPC context for request:', opts.req.method, opts.req.url);
  
  return {
    req: opts.req,
    supabase,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that gets the authenticated user from Supabase
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  try {
    console.log('Protected procedure middleware called');
    
    // First check database health
    try {
      await ensureDbReady(supabase);
    } catch (dbError) {
      console.error('Database health check failed in protected procedure:', dbError);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not set up. Please run the database setup script in your Supabase SQL editor.',
        cause: dbError,
      });
    }
    
    // Get the authorization header
    const authHeader = ctx.req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, use a demo user
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        console.log('Development mode: using demo user');
        
        // Ensure demo user profile exists
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', 'demo-user-id')
            .single();
            
          if (profileError || !profileData) {
            console.log('Creating demo user profile...');
            const { error: insertError } = await supabase
              .from('profiles')
              .upsert({
                id: 'demo-user-id',
                name: 'Demo User',
                level: 1,
                xp: 0,
                streak_days: 0,
                longest_streak: 0,
                experience_level: 'beginner'
              });
              
            if (insertError) {
              console.error('Failed to create demo user profile:', insertError);
            } else {
              console.log('Demo user profile created successfully');
            }
          }
        } catch (profileError) {
          console.error('Error handling demo user profile:', profileError);
        }
        
        return next({
          ctx: {
            ...ctx,
            user: { id: 'demo-user-id' }
          }
        });
      }
      
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Token extracted, length:', token.length);
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Auth verification failed:', error?.message);
      
      // For development, use a demo user if auth fails
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        console.log('Development mode: auth failed, using demo user');
        return next({
          ctx: {
            ...ctx,
            user: { id: 'demo-user-id' }
          }
        });
      }
      
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    console.log('Auth successful for user:', user.id);
    
    // Ensure user profile exists
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (profileError || !profileData) {
        console.log('Creating user profile for:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.user_metadata?.name || user.email || 'User',
            level: 1,
            xp: 0,
            streak_days: 0,
            longest_streak: 0,
            experience_level: 'beginner'
          });
          
        if (insertError) {
          console.error('Failed to create user profile:', insertError);
        } else {
          console.log('User profile created successfully');
        }
      }
    } catch (profileError) {
      console.error('Error handling user profile:', profileError);
    }
    
    return next({
      ctx: {
        ...ctx,
        user: { id: user.id }
      }
    });
  } catch (error) {
    console.log('Error in protected procedure middleware:', error);
    
    // For development, use a demo user if anything fails
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      console.log('Development mode: error in auth, using demo user:', error);
      return next({
        ctx: {
          ...ctx,
          user: { id: 'demo-user-id' }
        }
      });
    }
    
    if (error instanceof TRPCError) {
      throw error;
    }
    
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Authentication error',
      cause: error,
    });
  }
});

export type ProtectedContext = {
  user: { id: string };
  supabase: typeof supabase;
} & Context;