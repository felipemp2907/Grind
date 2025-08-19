export type Priority = 'low' | 'medium' | 'high';

export interface GoalInput {
  id: string;
  title: string;
  description?: string;
  category?: string;
  deadlineISO: string;
  createdAtISO: string;
  targetValue?: number;
  unit?: string;
  priority?: Priority;
}

export interface StreakTaskSpec {
  title: string;
  description: string;
  xp: number;
  proofRequired: boolean;
}

export interface ScheduledTask {
  goalId: string;
  title: string;
  description: string;
  xp: number;
  dateISO: string;
  isStreak: boolean;
  proofRequired: boolean;
  tags?: string[];
}

export interface PlanResult {
  streaks: StreakTaskSpec[];
  schedule: ScheduledTask[];
  notes: string[];
}
