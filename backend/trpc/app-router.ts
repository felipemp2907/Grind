import { createTRPCRouter } from "./create-context";
import { hiProcedure, testProtectedProcedure } from "./routes/example/hi/route";
import { createUltimateGoalProcedure, createGoalProcedure, updateUltimateGoalProcedure } from "./routes/goals/create-ultimate-goal";
import { generateTodayTasksProcedure, getStreakTasksProcedure, generateStreakTasksProcedure } from "./routes/tasks/generate-today-tasks";

console.log('🔧 Building tRPC app router...');
console.log('Available procedures:', {
  'example.hi': !!hiProcedure,
  'example.test': !!testProtectedProcedure,
  'goals.create': !!createGoalProcedure,
  'goals.createUltimate': !!createUltimateGoalProcedure,
  'goals.updateUltimate': !!updateUltimateGoalProcedure,
  'tasks.generateToday': !!generateTodayTasksProcedure,
  'tasks.getStreakTasks': !!getStreakTasksProcedure,
  'tasks.generateStreak': !!generateStreakTasksProcedure,
});

// Verify all procedures are properly imported
if (!hiProcedure) console.error('❌ hiProcedure is undefined');
if (!testProtectedProcedure) console.error('❌ testProtectedProcedure is undefined');
if (!createGoalProcedure) console.error('❌ createGoalProcedure is undefined');
if (!createUltimateGoalProcedure) console.error('❌ createUltimateGoalProcedure is undefined');
if (!updateUltimateGoalProcedure) console.error('❌ updateUltimateGoalProcedure is undefined');
if (!generateTodayTasksProcedure) console.error('❌ generateTodayTasksProcedure is undefined');
if (!getStreakTasksProcedure) console.error('❌ getStreakTasksProcedure is undefined');
if (!generateStreakTasksProcedure) console.error('❌ generateStreakTasksProcedure is undefined');

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
    getStreakTasks: getStreakTasksProcedure,
    generateStreak: generateStreakTasksProcedure,
  }),
});

console.log('✅ tRPC app router built successfully');
console.log('Router procedures available:', {
  'example.hi': 'available',
  'example.test': 'available',
  'goals.create': 'available',
  'goals.createUltimate': 'available',
  'goals.updateUltimate': 'available',
  'tasks.generateToday': 'available',
  'tasks.getStreakTasks': 'available',
  'tasks.generateStreak': 'available',
});

export type AppRouter = typeof appRouter;