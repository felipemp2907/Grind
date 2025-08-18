import { z } from 'zod';

// Task schema for both streak and today tasks
const TaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  desc: z.string().min(1, 'Task description is required'),
  load: z.number().int().min(1).max(5, 'Task load must be between 1 and 5'),
  proof_mode: z.enum(['flex', 'realtime'], {
    errorMap: () => ({ message: 'Proof mode must be either "flex" or "realtime"' })
  })
});

// Daily plan entry schema
const DailyPlanEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  today_tasks: z.array(TaskSchema).max(3, 'Maximum 3 today-tasks per day')
});

// Main plan schema
export const PlanSchema = z.object({
  streak_habits: z.array(TaskSchema)
    .min(1, 'At least 1 streak habit is required')
    .max(3, 'Maximum 3 streak habits allowed')
    .refine(
      (habits) => habits.every(h => h.load <= 2),
      'Streak habits must have load ≤ 2'
    ),
  daily_plan: z.array(DailyPlanEntrySchema)
    .min(1, 'Daily plan must have at least one day')
});

// Validation function with detailed error reporting
export function validatePlan(planData: any): { 
  success: boolean; 
  data?: z.infer<typeof PlanSchema>; 
  error?: string; 
  details?: string[];
} {
  try {
    const result = PlanSchema.safeParse(planData);
    
    if (!result.success) {
      const errorDetails = result.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      
      return {
        success: false,
        error: 'Plan validation failed',
        details: errorDetails
      };
    }
    
    // Additional business logic validation
    const plan = result.data;
    const errors: string[] = [];
    
    // Check daily load limits
    const streakLoad = plan.streak_habits.reduce((sum, habit) => sum + habit.load, 0);
    
    for (const [index, day] of plan.daily_plan.entries()) {
      const todayLoad = day.today_tasks.reduce((sum, task) => sum + task.load, 0);
      const totalDailyLoad = streakLoad + todayLoad;
      
      if (totalDailyLoad > 5) {
        errors.push(`Day ${index + 1} (${day.date}): Total daily load ${totalDailyLoad} exceeds maximum of 5`);
      }
      
      // Check for duplicate task titles on same day
      const taskTitles = day.today_tasks.map(t => t.title.toLowerCase());
      const duplicates = taskTitles.filter((title, i) => taskTitles.indexOf(title) !== i);
      if (duplicates.length > 0) {
        errors.push(`Day ${index + 1} (${day.date}): Duplicate task titles: ${duplicates.join(', ')}`);
      }
    }
    
    // Check for chronological order
    const dates = plan.daily_plan.map(d => new Date(d.date));
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] <= dates[i - 1]) {
        errors.push(`Dates must be in chronological order. Issue at day ${i + 1}`);
      }
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        error: 'Business logic validation failed',
        details: errors
      };
    }
    
    return {
      success: true,
      data: plan
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Type exports
export type PlanData = z.infer<typeof PlanSchema>;
export type TaskData = z.infer<typeof TaskSchema>;
export type DailyPlanEntry = z.infer<typeof DailyPlanEntrySchema>;

// Legacy exports for backward compatibility
export const StreakHabitSchema = TaskSchema;
export const TodayTaskSchema = TaskSchema;
export const DailyPlanSchema = DailyPlanEntrySchema;
export const FullPlanSchema = PlanSchema;
export type StreakHabit = TaskData;
export type TodayTask = TaskData;
export type DailyPlan = DailyPlanEntry;
export type FullPlan = PlanData;