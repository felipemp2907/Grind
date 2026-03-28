import { Goal } from '@/types';

export interface StreakTemplate {
  title: string;
  description: string;
  xpValue: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Build a streak template for a goal based on its characteristics
 */
export function buildStreakTemplate(goal: Goal): StreakTemplate[] {
  // Default streak habits based on goal type/content
  const defaultStreaks: StreakTemplate[] = [
    {
      title: `Daily progress on ${goal.title}`,
      description: `Make consistent daily progress toward your goal: ${goal.description.substring(0, 50)}...`,
      xpValue: 25,
      priority: 'high' as const
    },
    {
      title: `Review and plan for ${goal.title}`,
      description: 'Reflect on yesterday\'s progress and plan today\'s actions',
      xpValue: 15,
      priority: 'medium' as const
    },
    {
      title: `Skill building for ${goal.title}`,
      description: 'Dedicate time to building the skills needed for this goal',
      xpValue: 20,
      priority: 'medium' as const
    }
  ];

  // Customize based on goal title/description keywords
  const goalText = `${goal.title} ${goal.description}`.toLowerCase();
  
  if (goalText.includes('fitness') || goalText.includes('workout') || goalText.includes('exercise')) {
    return [
      {
        title: 'Daily workout session',
        description: 'Complete your planned workout for the day',
        xpValue: 30,
        priority: 'high' as const
      },
      {
        title: 'Track nutrition and hydration',
        description: 'Log your meals and ensure adequate water intake',
        xpValue: 15,
        priority: 'medium' as const
      },
      {
        title: 'Recovery and stretching',
        description: 'Dedicate time to recovery, stretching, or mobility work',
        xpValue: 20,
        priority: 'medium' as const
      }
    ];
  }
  
  if (goalText.includes('learn') || goalText.includes('study') || goalText.includes('course')) {
    return [
      {
        title: 'Daily study session',
        description: 'Dedicate focused time to learning and studying',
        xpValue: 25,
        priority: 'high' as const
      },
      {
        title: 'Practice and application',
        description: 'Apply what you\'ve learned through practice or exercises',
        xpValue: 20,
        priority: 'high' as const
      },
      {
        title: 'Review and note-taking',
        description: 'Review previous material and organize your notes',
        xpValue: 15,
        priority: 'medium' as const
      }
    ];
  }
  
  if (goalText.includes('business') || goalText.includes('startup') || goalText.includes('entrepreneur')) {
    return [
      {
        title: 'Business development work',
        description: 'Focus on core business activities and growth',
        xpValue: 30,
        priority: 'high' as const
      },
      {
        title: 'Network and connect',
        description: 'Reach out to potential customers, partners, or mentors',
        xpValue: 20,
        priority: 'medium' as const
      },
      {
        title: 'Learn and research',
        description: 'Stay updated with industry trends and best practices',
        xpValue: 15,
        priority: 'medium' as const
      }
    ];
  }
  
  if (goalText.includes('write') || goalText.includes('book') || goalText.includes('blog')) {
    return [
      {
        title: 'Daily writing session',
        description: 'Dedicate time to writing and creating content',
        xpValue: 25,
        priority: 'high' as const
      },
      {
        title: 'Research and planning',
        description: 'Research topics and plan your writing structure',
        xpValue: 20,
        priority: 'medium' as const
      },
      {
        title: 'Edit and review',
        description: 'Review and edit your previous writing',
        xpValue: 15,
        priority: 'medium' as const
      }
    ];
  }
  
  return defaultStreaks;
}

/**
 * Calculate the number of days between today and a deadline (inclusive)
 */
export function calculateDaysToDeadline(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(diffDays + 1, 0); // +1 to include today, minimum 0
}

/**
 * Check if a date is beyond the latest goal deadline
 */
export function isDateBeyondDeadlines(date: string, goals: Goal[]): boolean {
  if (goals.length === 0) return true;
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const latestDeadline = Math.max(
    ...goals
      .filter(goal => goal.status === 'active')
      .map(goal => new Date(goal.deadline).getTime())
  );
  
  return targetDate.getTime() > latestDeadline;
}

/**
 * Get active goals for a specific date
 */
export function getActiveGoalsForDate(date: string, goals: Goal[]): Goal[] {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return goals.filter(goal => {
    if (goal.status !== 'active') return false;
    
    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);
    
    return deadline.getTime() >= targetDate.getTime();
  });
}