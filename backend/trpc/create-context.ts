import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  return {
    req: opts.req,
    // You can add more context items here like database connections, auth, etc.
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// For now, we'll create a simple protected procedure that assumes authentication is handled elsewhere
// In a real app, you'd want to add proper authentication middleware here
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Add your authentication logic here
  // For now, we'll just pass through with a mock user
  return next({
    ctx: {
      ...ctx,
      user: { id: 'mock-user-id' } // Replace with actual user from auth
    }
  });
});

// Export the protectedProcedure for use in other files
export { protectedProcedure as protectedProcedure };

export type ProtectedContext = {
  user: { id: string };
} & Context;