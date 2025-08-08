-- Migration script to add required columns for the new task system
-- This script is idempotent and can be run multiple times safely

-- Add required columns to tasks table if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex';

-- Add required columns to goals table if they don't exist
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;

-- Add required columns to profiles table if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner';

-- Add constraints to ensure data integrity
DO $$
BEGIN
  -- Add type constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check 
    CHECK (type IN ('streak', 'today'));
  END IF;

  -- Add proof_mode constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_proof_mode_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_proof_mode_check 
    CHECK (proof_mode IN ('flex', 'realtime'));
  END IF;

  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_status_check'
  ) THEN
    ALTER TABLE public.goals ADD CONSTRAINT goals_status_check 
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));
  END IF;

  -- Add experience_level constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_experience_level_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_experience_level_check 
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));
  END IF;

  -- Add task type shape constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
      (type='streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type='today'  AND task_date IS NULL     AND due_at IS NOT NULL) OR
      (type IS NULL) -- Allow existing records without type
    );
  END IF;
END$$;

-- Create helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, (due_at::date));
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON public.tasks(user_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals(user_id, status);

-- Update existing tasks to have a default type if they don't have one
UPDATE public.tasks 
SET type = CASE 
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL;

-- Update existing goals to have active status if they don't have one
UPDATE public.goals 
SET status = 'active'
WHERE status IS NULL;

-- Update existing profiles to have beginner experience level if they don't have one
UPDATE public.profiles 
SET experience_level = 'beginner'
WHERE experience_level IS NULL;

-- Migrate existing due_date to due_at for today tasks
UPDATE public.tasks 
SET due_at = due_date
WHERE type = 'today' AND due_at IS NULL AND due_date IS NOT NULL;

-- Set task_date for streak tasks that don't have it (use due_date as fallback)
UPDATE public.tasks 
SET task_date = due_date::date
WHERE type = 'streak' AND task_date IS NULL AND due_date IS NOT NULL;

SELECT 'Task system migration completed successfully!' as status;

-- Display updated table structure
SELECT 'UPDATED TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;