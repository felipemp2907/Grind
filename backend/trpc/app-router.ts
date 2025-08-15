import { createTRPCRouter, publicProcedure } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { getStreakTasksProcedure, getTodayTasksProcedure, getAllTasksForDateProcedure } from "./routes/tasks/get-tasks";
import { z } from 'zod';
// Legacy generate procedures removed - tasks are now generated automatically on goal creation

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
    // Legacy generate procedures - deprecated, tasks are now generated automatically on goal creation
    generateToday: publicProcedure.input(z.any()).mutation(() => ({ 
      tasks: [], 
      notice: 'Task generation is now automatic on goal creation. This endpoint is deprecated.' 
    })),
    generateStreak: publicProcedure.input(z.any()).mutation(() => ({ 
      tasks: [], 
      notice: 'Task generation is now automatic on goal creation. This endpoint is deprecated.' 
    })),
  }),
});

export type AppRouter = typeof appRouter;