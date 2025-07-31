import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { generateTodayTasksProcedure } from "./routes/tasks/generate-today-tasks";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  goals: createTRPCRouter({
    createUltimate: createUltimateGoalProcedure,
  }),
  tasks: createTRPCRouter({
    generateToday: generateTodayTasksProcedure,
  }),
});

export type AppRouter = typeof appRouter;