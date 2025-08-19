import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure, reseedGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { getStreakTasksProcedure, getTodayTasksProcedure, getAllTasksForDateProcedure } from "./routes/tasks/get-tasks";
import { healthPingProcedure, healthProcedure, testInsertProcedure, testGoalInsertProcedure, testTaskInsertProcedure } from "./routes/health/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
    test: testProtectedProcedure,
  }),
  health: createTRPCRouter({
    ping: healthPingProcedure,
    check: healthProcedure,
    testInsert: testInsertProcedure,
    testGoalInsert: testGoalInsertProcedure,
    testTaskInsert: testTaskInsertProcedure,
  }),
  goals: createTRPCRouter({
    create: createGoalProcedure,
    createUltimate: createUltimateGoalProcedure,
    updateUltimate: updateUltimateGoalProcedure,
    reseed: reseedGoalProcedure,
  }),
  tasks: createTRPCRouter({
    getStreakTasks: getStreakTasksProcedure,
    getTodayTasks: getTodayTasksProcedure,
    getAllForDate: getAllTasksForDateProcedure,
  }),
});

export type AppRouter = typeof appRouter;