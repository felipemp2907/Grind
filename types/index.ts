export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  category: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
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
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  longestStreak: number;
  avatarUrl?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    image?: string;
  }>;
}

// New types for enhanced features
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
  tone: 'cheerful' | 'data-driven' | 'tough-love';
  escalationLevel: number;
  createdAt: string;
  dismissed: boolean;
}

export interface FocusSession {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  completed: boolean;
  distractionsDetected: number;
  xpEarned: number;
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