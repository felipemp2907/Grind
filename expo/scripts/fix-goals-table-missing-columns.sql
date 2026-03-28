-- CRITICAL FIX: Add missing columns to goals table
-- This script adds the missing columns that the tRPC procedures expect

BEGIN;

-- Add missing columns to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';

-- Add missing columns to tasks table for streak functionality
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('regular', 'streak', 'milestone')) DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS task_date DATE,
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON public.tasks(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit ON public.tasks(is_habit);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);

-- Update existing goals to have default status if null
UPDATE public.goals SET status = 'active' WHERE status IS NULL;

-- Update existing tasks to have default type if null
UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;

COMMIT;

-- Force schema cache refresh for PostgREST/Supabase
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Goals table columns updated successfully!' as status;

-- Display updated goals table structure
SELECT 'UPDATED GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

-- Display updated tasks table structure
SELECT 'UPDATED TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;