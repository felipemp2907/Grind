import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { getStreakTasksProcedure, getTodayTasksProcedure, getAllTasksForDateProcedure } from "./routes/tasks/get-tasks";
import { generateTodayTasksProcedure, generateStreakTasksProcedure } from "./routes/tasks/generate-today-tasks";

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
    generateToday: generateTodayTasksProcedure,
    generateStreak: generateStreakTasksProcedure,
  }),
});

export type AppRouter = typeof appRouter;