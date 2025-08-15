import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { getStreakTasksProcedure, getTodayTasksProcedure, getAllTasksForDateProcedure } from "./routes/tasks/get-tasks";
// Tasks are generated automatically on goal creation/update; no manual generation routes remain.

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
    test: testProtectedProcedure,
  }),
  goals: createTRPCRouter({
    create: createGoalProcedure,
    createUltimate: createUltimateGoalProcedure,
    updateUltimate: updateUltimateGoalProcedure,
  }),
  tasks: createTRPCRouter({
    getStreakTasks: getStreakTasksProcedure,
    getTodayTasks: getTodayTasksProcedure,
    getAllForDate: getAllTasksForDateProcedure,
  }),
});

export type AppRouter = typeof appRouter;