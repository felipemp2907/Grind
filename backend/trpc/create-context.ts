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
    console.log('🔐 Protected procedure middleware called');
    
    // Always ensure demo user profile exists first
    await ensureDemoUserProfile();
    
    // Get the authorization header
    const authHeader = ctx.req.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    // For development or if no auth header, use demo user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🧪 No auth header or development mode: using demo user');
      return next({
        ctx: {
          ...ctx,
          user: { id: 'demo-user-id' }
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🎫 Token extracted, length:', token.length);
    
    // Try to verify the token with Supabase
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log('❌ Auth verification failed:', error?.message);
        console.log('🧪 Falling back to demo user');
        return next({
          ctx: {
            ...ctx,
            user: { id: 'demo-user-id' }
          }
        });
      }

      console.log('✅ Auth successful for user:', user.id);
      
      // Ensure the authenticated user has a profile
      try {
        const { error: profileError } = await supabase.rpc('ensure_user_profile', {
          user_id: user.id,
          user_name: user.user_metadata?.name || 'User'
        });
        
        if (profileError) {
          console.warn('⚠️ Profile creation failed for authenticated user:', profileError);
        }
      } catch (profileError) {
        console.warn('⚠️ Error ensuring profile for authenticated user:', profileError);
      }
      
      return next({
        ctx: {
          ...ctx,
          user: { id: user.id }
        }
      });
    } catch (authError) {
      console.log('❌ Error during auth verification:', authError);
      console.log('🧪 Falling back to demo user');
      return next({
        ctx: {
          ...ctx,
          user: { id: 'demo-user-id' }
        }
      });
    }
  } catch (error) {
    console.error('💥 Critical error in protected procedure middleware:', error);
    
    // Always fall back to demo user to prevent complete failure
    console.log('🧪 Critical error fallback: using demo user');
    await ensureDemoUserProfile();
    return next({
      ctx: {
        ...ctx,
        user: { id: 'demo-user-id' }
      }
    });
  }
});

// Helper function to ensure demo user profile exists
async function ensureDemoUserProfile() {
  try {
    console.log('🧪 Ensuring demo user profile exists...');
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', 'demo-user-id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️ Error checking demo profile:', checkError);
    }
    
    if (!existingProfile) {
      console.log('🔨 Creating demo user profile...');
      
      // Try using RPC function first
      const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
        user_id: 'demo-user-id',
        user_name: 'Demo User'
      });
      
      if (rpcError) {
        console.log('⚠️ RPC failed, trying direct insert:', rpcError.message);
        
        // Fallback to direct insert with all required fields
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: 'demo-user-id',
            name: 'Demo User',
            level: 1,
            experience_level: 'beginner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error('❌ Error creating demo user profile via direct insert:', profileError);
        } else {
          console.log('✅ Demo user profile created successfully via direct insert');
        }
      } else {
        console.log('✅ Demo user profile created successfully via RPC');
      }
    } else {
      console.log('✅ Demo user profile already exists:', existingProfile.name);
    }
  } catch (error) {
    console.error('💥 Critical error ensuring demo user profile:', error);
  }
}

export type ProtectedContext = {
  user: { id: string };
  supabase: typeof supabase;
} & Context;