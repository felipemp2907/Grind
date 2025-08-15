import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, type ProtectedContext } from '../../create-context';
import { calculateDaysToDeadline } from '../../../../utils/streakUtils';

// Generate today tasks procedure (legacy compatibility)
export const generateTodayTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string()
  }))
  .mutation(async ({ input, ctx }: { input: { targetDate: string }; ctx: ProtectedContext }) => {
    console.log('Legacy generateToday called for date:', input.targetDate);
    
    // This is a legacy endpoint - the new system generates all tasks at goal creation
    // Return a message indicating the new flow
    return {
      message: 'Task generation now happens automatically at goal creation',
      tasksGenerated: 0,
      note: 'Please create or edit a goal to generate tasks for the entire timeline'
    };
  });

// Generate streak tasks procedure (legacy compatibility)
export const generateStreakTasksProcedure = protectedProcedure
  .input(z.object({
    targetDate: z.string(),
    forceRegenerate: z.boolean().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { targetDate: string; forceRegenerate?: boolean }; ctx: ProtectedContext }) => {
    console.log('Legacy generateStreak called for date:', input.targetDate);
    
    // This is a legacy endpoint - the new system generates all tasks at goal creation
    // Return a message indicating the new flow
    return {
      message: 'Streak task generation now happens automatically at goal creation',
      tasksGenerated: 0,
      note: 'Please create or edit a goal to generate streak tasks for the entire timeline'
    };
  });