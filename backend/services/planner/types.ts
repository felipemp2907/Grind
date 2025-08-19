export type PhaseName = 'foundation' | 'build' | 'peak' | 'deload';

export type ProofMode = 'realtime' | 'flex';

export interface StreakHabit {
  title: string;
  desc: string;
  load: number;
  proof_mode: ProofMode;
}

export interface TodayTaskTemplate {
  key: string;
  title: string;
  desc: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  proof_mode: ProofMode;
  xp: { base: number; peak?: number };
}

export interface SupportTaskTemplate extends TodayTaskTemplate {}

export interface PhaseSpan {
  name: PhaseName;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface PlanDataTS {
  streak_habits: StreakHabit[];
  daily_plan: Array<{
    date: string; // YYYY-MM-DD
    today_tasks: Array<{ title: string; desc: string; load: number; proof_mode: ProofMode }>;
  }>;
}

export interface NormalizeInput {
  title: string;
  description: string;
  category?: string;
  target_value?: number;
  unit?: string;
  deadlineISO?: string;
  constraints?: {
    daysAvailable?: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
    timeBudgetPerDay?: number; // minutes
    injuries?: string[];
    resources?: string[];
  };
  tzOffsetMinutes?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface NormalizedGoal {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  days: number;
  tzOffsetMinutes: number;
  constraints: Required<NonNullable<NormalizeInput['constraints']>>;
  experience: 'beginner' | 'intermediate' | 'advanced';
}

export type ArchetypeKey =
  | 'fitness.muscle_gain'
  | 'study.exam'
  | 'language.learning'
  | 'music.guitar'
  | 'endurance.marathon'
  | 'general.smart_goal';

export interface ArchetypeModule {
  getStreaks: (g: NormalizedGoal) => StreakHabit[];
  getWeekly: (g: NormalizedGoal) => TodayTaskTemplate[];
  getSupport: (g: NormalizedGoal) => SupportTaskTemplate[];
}
