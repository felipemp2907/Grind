import { z } from "zod";
import { publicProcedure, protectedProcedure, type ProtectedContext } from "../../../create-context";

type HiInput = { name?: string } | undefined;

export const hiProcedure = publicProcedure
  .input(z.object({ name: z.string().optional() }).optional())
  .query(({ input }: { input: HiInput }) => {
    return {
      hello: input?.name || 'World',
      date: new Date(),
      message: 'tRPC is working!'
    };
  });

export const testProtectedProcedure = protectedProcedure
  .query(({ ctx }: { ctx: ProtectedContext }) => {
    return {
      message: 'Protected route working!',
      userId: ctx.user.id,
      timestamp: new Date().toISOString(),
    };
  });

export default hiProcedure;