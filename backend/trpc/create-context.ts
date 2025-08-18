import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create a server-side Supabase client
const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';


// Supabase keys
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE0NDYwMiwiZXhwIjoyMDYyNzIwNjAyfQ.SCVexKSM6ktxwCnkq-mM8q6XoJsWCgiymSWcqmUde-Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

// Create admin client for server-side operations (bypasses RLS)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseServiceRoleKey;
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { 
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'grind-app-admin'
    }
  }
});

console.log('Supabase Admin client initialized with service role');

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
  const authHeader = opts.req.headers.get('authorization') || opts.req.headers.get('Authorization');
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let userId: string | null = null;
  let supabaseUser: SupabaseClient | null = null;
  if (bearer) {
    try {
      const { data: { user } } = await supabase.auth.getUser(bearer);
      userId = user?.id ?? null;
      // Create a per-request user client so all queries run with the user's RLS context
      supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } as Record<string, string> }
      });
    } catch {
      console.log('Token validation failed in context');
    }
  }
  return {
    req: opts.req,
    supabase,
    supabaseUser,
    userId,
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
  console.log('Protected procedure middleware called');

  try {
    await ensureDbReady(supabase);
  } catch (dbError) {
    console.warn('DB health check failed:', dbError);
  }

  const authHeader = ctx.req.headers.get('authorization') || ctx.req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing Authorization bearer token' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }

  try {
    // Use service role for profile operations to bypass RLS
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    if (profileError || !profileData) {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: user.user_metadata?.name || user.email || 'User',
          level: 1,
          xp: 0,
          streak_days: 0,
          longest_streak: 0,
          experience_level: 'beginner'
        });
    }
  } catch (profileError) {
    console.warn('Profile ensure failed:', profileError);
  }

  return next({
    ctx: {
      ...ctx,
      user: { id: user.id },
      // Provide both user-scoped and admin clients
      supabase: createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } as Record<string, string> }
      }),
      supabaseAdmin // Service role client for backend operations
    }
  });
});

export type ProtectedContext = {
  user: { id: string };
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
} & Context;