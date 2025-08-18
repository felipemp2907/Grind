-- Add missing columns for client planner support
-- Run this script in your Supabase SQL Editor

-- Add missing columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak', 'today'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_date DATE;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));

-- Add constraint to ensure proper task type structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tasks_type_shape'
  ) THEN
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_type_shape CHECK (
      (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type = 'today' AND task_date IS NULL AND due_at IS NOT NULL) OR
      (type IS NULL) -- Allow existing tasks without type
    );
  END IF;
END $$;

-- Add missing columns to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100;

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'));

-- Add missing column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type ON public.tasks(user_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, task_date);

-- Update existing tasks to have proper type based on is_habit
UPDATE public.tasks 
SET type = CASE 
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL;

-- For streak tasks, set task_date from due_date if available
UPDATE public.tasks 
SET task_date = due_date::date
WHERE type = 'streak' AND task_date IS NULL AND due_date IS NOT NULL;

-- For today tasks, set due_at from due_date if available
UPDATE public.tasks 
SET due_at = due_date
WHERE type = 'today' AND due_at IS NULL AND due_date IS NOT NULL;

SELECT 'Client planner columns added successfully!' as status;

-- Display updated table structure
SELECT 'UPDATED TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'UPDATED GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;