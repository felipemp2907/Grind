import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { generateTodayTasksProcedure } from "./routes/tasks/generate-today-tasks";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
    test: testProtectedProcedure,
  }),
  goals: createTRPCRouter({
    create: createGoalProcedure,
    createUltimate: createUltimateGoalProcedure,
  }),
  tasks: createTRPCRouter({
    generateToday: generateTodayTasksProcedure,
  }),
});

export type AppRouter = typeof appRouter;