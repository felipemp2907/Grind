import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client
const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    
    // Get the authorization header
    const authHeader = ctx.req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, use a demo user
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        console.log('Development mode: using demo user');
        await ensureDemoUserProfile();
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
        await ensureDemoUserProfile();
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
      await ensureDemoUserProfile();
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

// Helper function to ensure demo user profile exists
async function ensureDemoUserProfile() {
  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', 'demo-user-id')
      .single();
    
    if (!existingProfile) {
      console.log('Creating demo user profile...');
      
      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: 'demo-user-id',
          name: 'Demo User',
          level: 1,
          xp: 0,
          streak_days: 0,
          longest_streak: 0
        });
      
      if (profileError) {
        console.error('Error creating demo user profile:', profileError);
      } else {
        console.log('Demo user profile created successfully');
      }
    }
  } catch (error) {
    console.error('Error ensuring demo user profile:', error);
  }
}

export type ProtectedContext = {
  user: { id: string };
  supabase: typeof supabase;
} & Context;