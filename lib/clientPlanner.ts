import { Task } from '@/types';

interface StreakHabit {
  title: string;
  description: string;
  load_score: number;
  proof_mode: 'flex' | 'realtime';
}

interface TodayTask {
  title: string;
  description: string;
  load_score: number;
  proof_mode: 'flex' | 'realtime';
}

interface DailyPlan {
  date: string;
  today_tasks: TodayTask[];
}

interface ClientPlanResult {
  streak_habits: StreakHabit[];
  daily_plan: DailyPlan[];
}

// Keywords to identify goal categories
const FITNESS_KEYWORDS = ['workout', 'exercise', 'gym', 'fitness', 'weight', 'muscle', 'cardio', 'run', 'lift', 'train', 'health', 'body'];
const LEARNING_KEYWORDS = ['learn', 'study', 'read', 'book', 'course', 'skill', 'practice', 'education', 'knowledge', 'language'];
const BUSINESS_KEYWORDS = ['business', 'startup', 'revenue', 'sales', 'marketing', 'client', 'customer', 'profit', 'income', 'work'];
const CREATIVE_KEYWORDS = ['write', 'create', 'art', 'design', 'music', 'video', 'content', 'blog', 'creative', 'project'];

function categorizeGoal(title: string, description: string): 'fitness' | 'learning' | 'business' | 'creative' | 'general' {
  const text = `${title} ${description}`.toLowerCase();
  
  if (FITNESS_KEYWORDS.some(keyword => text.includes(keyword))) return 'fitness';
  if (LEARNING_KEYWORDS.some(keyword => text.includes(keyword))) return 'learning';
  if (BUSINESS_KEYWORDS.some(keyword => text.includes(keyword))) return 'business';
  if (CREATIVE_KEYWORDS.some(keyword => text.includes(keyword))) return 'creative';
  
  return 'general';
}

function generateStreakHabits(category: 'fitness' | 'learning' | 'business' | 'creative' | 'general', goalTitle: string): StreakHabit[] {
  const habits: StreakHabit[] = [];
  
  switch (category) {
    case 'fitness':
      habits.push(
        {
          title: 'Daily Workout',
          description: 'Complete your planned workout session',
          load_score: 2,
          proof_mode: 'realtime'
        },
        {
          title: 'Track Progress',
          description: 'Log your fitness metrics and progress',
          load_score: 1,
          proof_mode: 'flex'
        }
      );
      break;
      
    case 'learning':
      habits.push(
        {
          title: 'Daily Study Session',
          description: 'Dedicated learning time for your goal',
          load_score: 2,
          proof_mode: 'flex'
        },
        {
          title: 'Practice & Review',
          description: 'Apply what you learned today',
          load_score: 1,
          proof_mode: 'flex'
        }
      );
      break;
      
    case 'business':
      habits.push(
        {
          title: 'Daily Business Action',
          description: 'Take one concrete step toward your business goal',
          load_score: 2,
          proof_mode: 'flex'
        },
        {
          title: 'Track Metrics',
          description: 'Monitor key business indicators',
          load_score: 1,
          proof_mode: 'flex'
        }
      );
      break;
      
    case 'creative':
      habits.push(
        {
          title: 'Daily Creative Work',
          description: 'Dedicate time to your creative project',
          load_score: 2,
          proof_mode: 'flex'
        },
        {
          title: 'Inspiration & Ideas',
          description: 'Collect ideas and inspiration for your project',
          load_score: 1,
          proof_mode: 'flex'
        }
      );
      break;
      
    default:
      habits.push(
        {
          title: 'Daily Progress',
          description: `Work on ${goalTitle.toLowerCase()}`,
          load_score: 2,
          proof_mode: 'flex'
        },
        {
          title: 'Reflect & Plan',
          description: 'Review progress and plan next steps',
          load_score: 1,
          proof_mode: 'flex'
        }
      );
  }
  
  return habits;
}

function generateTodayTasks(category: 'fitness' | 'learning' | 'business' | 'creative' | 'general', date: Date, dayIndex: number, totalDays: number): TodayTask[] {
  const tasks: TodayTask[] = [];
  const isFirstWeek = dayIndex < 7;
  const isLastWeek = dayIndex >= totalDays - 7;
  const isWeekly = dayIndex % 7 === 0;
  
  // Add category-specific tasks
  switch (category) {
    case 'fitness':
      if (isFirstWeek) {
        tasks.push({
          title: 'Set Baseline Measurements',
          description: 'Record starting weight, measurements, and fitness level',
          load_score: 1,
          proof_mode: 'realtime'
        });
      }
      if (isWeekly && !isFirstWeek) {
        tasks.push({
          title: 'Weekly Progress Check',
          description: 'Measure progress and adjust workout plan if needed',
          load_score: 2,
          proof_mode: 'realtime'
        });
      }
      if (dayIndex % 3 === 0) {
        tasks.push({
          title: 'Plan Next Workouts',
          description: 'Schedule and plan your next 3 workout sessions',
          load_score: 1,
          proof_mode: 'flex'
        });
      }
      break;
      
    case 'learning':
      if (isFirstWeek) {
        tasks.push({
          title: 'Create Learning Plan',
          description: 'Outline your learning objectives and resources',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (isWeekly && !isFirstWeek) {
        tasks.push({
          title: 'Weekly Knowledge Review',
          description: 'Test yourself on what you learned this week',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (dayIndex % 5 === 0) {
        tasks.push({
          title: 'Find New Resources',
          description: 'Research additional learning materials or courses',
          load_score: 1,
          proof_mode: 'flex'
        });
      }
      break;
      
    case 'business':
      if (isFirstWeek) {
        tasks.push({
          title: 'Define Success Metrics',
          description: 'Set clear KPIs and success indicators',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (isWeekly && !isFirstWeek) {
        tasks.push({
          title: 'Weekly Business Review',
          description: 'Analyze performance and adjust strategy',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (dayIndex % 3 === 0) {
        tasks.push({
          title: 'Network & Connect',
          description: 'Reach out to potential clients or partners',
          load_score: 1,
          proof_mode: 'flex'
        });
      }
      break;
      
    case 'creative':
      if (isFirstWeek) {
        tasks.push({
          title: 'Create Project Outline',
          description: 'Plan the structure and timeline of your creative project',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (isWeekly && !isFirstWeek) {
        tasks.push({
          title: 'Weekly Creative Review',
          description: 'Review your work and gather feedback',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (dayIndex % 4 === 0) {
        tasks.push({
          title: 'Seek Inspiration',
          description: 'Explore new ideas and creative references',
          load_score: 1,
          proof_mode: 'flex'
        });
      }
      break;
      
    default:
      if (isWeekly) {
        tasks.push({
          title: 'Weekly Progress Review',
          description: 'Assess your progress and plan for the next week',
          load_score: 2,
          proof_mode: 'flex'
        });
      }
      if (dayIndex % 3 === 0) {
        tasks.push({
          title: 'Strategic Planning',
          description: 'Plan your next steps and priorities',
          load_score: 1,
          proof_mode: 'flex'
        });
      }
  }
  
  // Add final week tasks
  if (isLastWeek) {
    tasks.push({
      title: 'Prepare for Goal Completion',
      description: 'Finalize remaining tasks and prepare for goal achievement',
      load_score: 2,
      proof_mode: 'flex'
    });
  }
  
  return tasks;
}

function isAfterAgendaTime(): boolean {
  const now = new Date();
  const agendaHour = 9; // 9 AM agenda time
  return now.getHours() >= agendaHour;
}

export function createClientPlan(goalData: {
  title: string;
  description: string;
  deadline: string;
}): ClientPlanResult {
  console.log('🤖 Creating client-side plan for goal:', goalData.title);
  
  const category = categorizeGoal(goalData.title, goalData.description);
  const streakHabits = generateStreakHabits(category, goalData.title);
  
  const today = new Date();
  const deadline = new Date(goalData.deadline);
  const totalDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyPlan: DailyPlan[] = [];
  
  // Generate plan for each day
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayIndex);
    
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // For today, keep it light if after agenda time
    let todayTasks: TodayTask[] = [];
    if (dayIndex === 0 && isAfterAgendaTime()) {
      // Light task for today if created after agenda time
      todayTasks = [{
        title: 'Quick Goal Setup',
        description: 'Review your goal and prepare for tomorrow',
        load_score: 1,
        proof_mode: 'flex'
      }];
    } else {
      todayTasks = generateTodayTasks(category, currentDate, dayIndex, totalDays);
      
      // Enforce caps: ≤3 today tasks, daily load ≤5 (including streaks)
      const streakLoad = streakHabits.reduce((sum, habit) => sum + habit.load_score, 0);
      const maxTodayLoad = Math.max(1, 5 - streakLoad);
      
      // Sort by load_score and take tasks that fit within the cap
      todayTasks.sort((a, b) => b.load_score - a.load_score);
      const filteredTasks: TodayTask[] = [];
      let currentLoad = 0;
      
      for (const task of todayTasks) {
        if (filteredTasks.length < 3 && currentLoad + task.load_score <= maxTodayLoad) {
          filteredTasks.push(task);
          currentLoad += task.load_score;
        }
      }
      
      todayTasks = filteredTasks;
    }
    
    dailyPlan.push({
      date: dateStr,
      today_tasks: todayTasks
    });
  }
  
  const result: ClientPlanResult = {
    streak_habits: streakHabits,
    daily_plan: dailyPlan
  };
  
  console.log('✅ Client plan created:', {
    category,
    streakCount: streakHabits.length,
    totalDays,
    totalTodayTasks: dailyPlan.reduce((sum, day) => sum + day.today_tasks.length, 0)
  });
  
  return result;
}

// Convert client plan to database task format
export function convertPlanToTasks(plan: ClientPlanResult, goalId: string): Omit<Task, 'id' | 'completed' | 'completedAt' | 'streak'>[] {
  const tasks: Omit<Task, 'id' | 'completed' | 'completedAt' | 'streak'>[] = [];
  
  // Create streak tasks for each day
  for (const day of plan.daily_plan) {
    for (const habit of plan.streak_habits) {
      tasks.push({
        title: habit.title,
        description: habit.description,
        date: day.date,
        goalId,
        xpValue: habit.load_score * 10, // Convert load to XP
        isHabit: true,
        scheduledTime: '09:00',
        priority: habit.load_score >= 2 ? 'high' : 'medium',
        estimatedTime: habit.load_score >= 2 ? '30-60 min' : '15-30 min',
        proofRequired: habit.proof_mode === 'realtime',
        type: 'streak',
        taskDate: day.date
      });
    }
    
    // Create today tasks
    for (const todayTask of day.today_tasks) {
      tasks.push({
        title: todayTask.title,
        description: todayTask.description,
        date: day.date,
        goalId,
        xpValue: todayTask.load_score * 15, // Higher XP for today tasks
        isHabit: false,
        scheduledTime: '09:00',
        priority: todayTask.load_score >= 2 ? 'high' : 'medium',
        estimatedTime: todayTask.load_score >= 2 ? '45-90 min' : '20-45 min',
        proofRequired: todayTask.proof_mode === 'realtime',
        type: 'today'
      });
    }
  }
  
  return tasks;
}