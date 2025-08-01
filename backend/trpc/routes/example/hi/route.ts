import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../create-context";

export const hiProcedure = publicProcedure
  .input(z.object({ name: z.string().optional() }).optional())
  .query(({ input }) => {
    return {
      hello: input?.name || 'World',
      date: new Date(),
      message: 'tRPC is working!'
    };
  });

export const testProtectedProcedure = protectedProcedure
  .query(({ ctx }) => {
    return {
      message: 'Protected route working!',
      userId: ctx.user.id,
      timestamp: new Date().toISOString(),
    };
  });

export default hiProcedure;