import { z } from 'zod';

export const StreakHabitSchema = z.object({
  title: z.string(),
  desc: z.string(),
  load: z.number().min(1).max(5),
  proof_mode: z.enum(['realtime', 'flex'])
});

export const TodayTaskSchema = z.object({
  title: z.string(),
  desc: z.string(),
  load: z.number().min(1).max(5),
  proof_mode: z.enum(['realtime', 'flex'])
});

export const DailyPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  today_tasks: z.array(TodayTaskSchema)
});

export const FullPlanSchema = z.object({
  streak_habits: z.array(StreakHabitSchema).min(1).max(3),
  daily_plan: z.array(DailyPlanSchema).min(1)
});

export type StreakHabit = z.infer<typeof StreakHabitSchema>;
export type TodayTask = z.infer<typeof TodayTaskSchema>;
export type DailyPlan = z.infer<typeof DailyPlanSchema>;
export type FullPlan = z.infer<typeof FullPlanSchema>;

export function validatePlan(plan: any): FullPlan {
  return FullPlanSchema.parse(plan);
}