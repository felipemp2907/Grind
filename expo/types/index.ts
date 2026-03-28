export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  category?: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields for Grind
  progressValue: number;
  targetValue: number;
  unit?: string; // 'kg', 'chapters', 'dollars', etc.
  xpEarned: number;
  streakCount: number;
  todayTasksIds: string[];
  streakTaskIds: string[];
  status: 'active' | 'completed' | 'abandoned';
  coverImage?: string;
  color?: string;
  priority?: 'high' | 'medium' | 'low';
  archivedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  progressThreshold?: number; // 25, 50, 75, 100 for milestone alerts
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  goalId: string;
  completed: boolean;
  completedAt?: string;
  xpValue: number;
  isHabit: boolean;
  streak: number;
  scheduledTime?: string; // HH:MM format
  journalEntryId?: string;
  isUserCreated?: boolean;
  requiresValidation?: boolean;
  priority?: 'high' | 'medium' | 'low';
  estimatedTime?: string;
  proofRequired?: boolean;
  proofSubmitted?: boolean;
  proofValidated?: boolean;
  type?: 'today' | 'streak';
  taskDate?: string; // YYYY-MM-DD format for streak tasks
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  taskId?: string;
  mediaUri?: string;
  reflection?: string;
  createdAt: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  validationFeedback?: string;
  validationConfidence?: 'high' | 'medium' | 'low';
  mood?: 'happy' | 'neutral' | 'sad' | 'excited' | 'anxious' | 'grateful';
  tags?: string[];
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  longestStreak: number;
  avatarUrl?: string;
  totalGoalsCompleted?: number;
  totalTasksCompleted?: number;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    image?: string;
  }>;
}

// Enhanced types for Grind features
export interface DailyAgenda {
  date: string;
  tasks: AgendaTask[];
  motivation: string;
  status: 'pending' | 'accepted' | 'regenerated';
  createdAt: string;
}

export interface AgendaTask {
  title: string;
  description: string;
  xpValue: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export interface MotivationMessage {
  id: string;
  message: string;
  tone: 'data-driven' | 'tough-love';
  escalationLevel: number;
  createdAt: string;
  dismissed: boolean;
}

export interface Challenge {
  id: string;
  code: '75_hard' | '30_day' | 'goggins_4x4x48';
  title: string;
  description: string;
  dayIndex: number;
  totalDays: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  rules: string[];
  dailyTasks: string[];
}

export interface ChallengeProgress {
  challengeId: string;
  dayIndex: number;
  completed: boolean;
  completedAt?: string;
  proofSubmitted?: boolean;
  notes?: string;
}



export interface ValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  feedback: string;
  suggestions?: string[];
  xpBonus?: number;
}

export interface TaskCommand {
  action: 'create' | 'update' | 'reschedule' | 'none';
  taskData?: {
    title: string;
    description?: string;
    date: string;
    time?: string;
    isHabit?: boolean;
    xpValue?: number;
  };
  updateData?: {
    taskId?: string;
    newDate?: string;
    newTime?: string;
  };
  confirmation: string;
}

export interface NightlyRecap {
  date: string;
  completedTasks: Array<{ title: string; xpValue: number }>;
  incompleteTasks: Array<{ title: string; description: string }>;
  recap: string;
  rescheduleSuggestions: Array<{
    taskTitle: string;
    suggestedDate: string;
    reason: string;
  }>;
  tomorrowFocus: string;
  createdAt: string;
}

// New types for enhanced Grind features
export interface GoalBreakdown {
  todayTasks: Array<{
    title: string;
    description: string;
    xpValue: number;
    estimatedTime: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  streakHabits: Array<{
    title: string;
    description: string;
    xpValue: number;
    frequency: 'daily' | 'weekly';
  }>;
  milestones: Array<{
    title: string;
    description: string;
    progressThreshold: number;
    dueDate?: string;
  }>;
  motivation: string;
  estimatedTimeToComplete: string;
}

export interface ProgressUpdate {
  goalId: string;
  newProgressValue: number;
  xpEarned: number;
  milestoneReached?: boolean;
  milestoneTitle?: string;
}

export interface GoalShareCard {
  goalTitle: string;
  progressPercentage: number;
  daysRemaining: number;
  streakCount: number;
  xpEarned: number;
  motivationalQuote: string;
  imageUrl: string;
}

export interface MilestoneAlert {
  id: string;
  goalId: string;
  milestoneTitle: string;
  progressPercentage: number;
  message: string;
  celebrationLevel: 'small' | 'medium' | 'large';
  createdAt: string;
  dismissed: boolean;
}