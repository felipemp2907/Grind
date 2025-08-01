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

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
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
    // Get the authorization header
    const authHeader = ctx.req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, use a demo user
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: using demo user');
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
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // For development, use a demo user if auth fails
      if (process.env.NODE_ENV === 'development') {
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

    return next({
      ctx: {
        ...ctx,
        user: { id: user.id }
      }
    });
  } catch (error) {
    // For development, use a demo user if anything fails
    if (process.env.NODE_ENV === 'development') {
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