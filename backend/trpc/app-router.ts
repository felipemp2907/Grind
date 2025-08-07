import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { generateTodayTasksProcedure } from "./routes/tasks/generate-today-tasks";

console.log('🔧 Building tRPC app router...');
console.log('Available procedures:', {
  'example.hi': !!hiProcedure,
  'example.test': !!testProtectedProcedure,
  'goals.create': !!createGoalProcedure,
  'goals.createUltimate': !!createUltimateGoalProcedure,
  'goals.updateUltimate': !!updateUltimateGoalProcedure,
  'tasks.generateToday': !!generateTodayTasksProcedure,
});

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
    generateToday: generateTodayTasksProcedure,
  }),
});

console.log('✅ tRPC app router built successfully');
console.log('Router procedures:', Object.keys(appRouter._def.procedures || {}));

export type AppRouter = typeof appRouter;