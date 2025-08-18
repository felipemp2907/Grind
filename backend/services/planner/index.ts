import { generatePlan } from './plan';
import { seedPlanToDatabase } from './seed';

interface PlanAndSeedResult {
  success: boolean;
  summary?: {
    goalId: string;
    days: number;
    streak_count: number;
    total_today: number;
    trimmed_days: number;
  };
  error?: string;
}

export async function planAndSeedFullGoal(
  userId: string,
  goalId: string,
  title: string,
  description: string,
  deadlineISO: string,
  experienceLevel: string = 'beginner',
  timezoneOffset: number = 0
): Promise<PlanAndSeedResult> {
  
  console.log(`Starting planAndSeedFullGoal for goal ${goalId}`);
  
  try {
    // 1. Generate the plan
    const planResult = await generatePlan({
      goal: {
        title,
        description,
        deadlineISO
      },
      user: {
        id: userId,
        experience_level: experienceLevel
      },
      timezone: timezoneOffset,
      agendaTime: '18:00', // Default agenda time
      now: new Date()
    });
    
    if (!planResult.success || !planResult.plan) {
      console.error('Plan generation failed:', planResult.error);
      return {
        success: false,
        error: planResult.error || 'Plan generation failed'
      };
    }
    
    console.log(`Plan generated successfully (${planResult.source}, ${planResult.retryCount} attempts)`);
    
    // 2. Seed the plan to database
    const seedResult = await seedPlanToDatabase({
      userId,
      goalId,
      plan: planResult.plan,
      agendaTime: '18:00', // Default agenda time
      timezone: timezoneOffset
    });
    
    if (!seedResult.success) {
      console.error('Plan seeding failed:', seedResult.error);
      return {
        success: false,
        error: seedResult.error || 'Plan seeding failed'
      };
    }
    
    console.log('Plan seeded successfully to database');
    
    return {
      success: true,
      summary: seedResult.summary
    };
    
  } catch (error) {
    console.error('planAndSeedFullGoal failed:', error);
    return {
      success: false,
      error: `Plan and seed operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}