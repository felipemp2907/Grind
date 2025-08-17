-- EMERGENCY FIX: Add missing completed column to tasks table
-- This fixes the "Could not find the 'completed' column" error

BEGIN;

-- Add the critical completed column that's causing the error
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Add other essential columns that the app expects
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('today', 'streak', 'regular')) DEFAULT 'regular';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex';

-- Update existing records
UPDATE public.tasks SET completed = FALSE WHERE completed IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET streak = 0 WHERE streak IS NULL;
UPDATE public.tasks SET priority = 'medium' WHERE priority IS NULL;
UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET load_score = 1 WHERE load_score IS NULL;
UPDATE public.tasks SET proof_mode = 'flex' WHERE proof_mode IS NULL;

-- Add essential columns to goals table too
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';

-- Update existing goals
UPDATE public.goals SET status = 'active' WHERE status IS NULL;
UPDATE public.goals SET target_value = 100 WHERE target_value IS NULL;
UPDATE public.goals SET unit = '' WHERE unit IS NULL;
UPDATE public.goals SET priority = 'medium' WHERE priority IS NULL;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON public.tasks(user_id, goal_id);

COMMIT;

-- Force schema refresh (CRITICAL!)
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(2);
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'EMERGENCY FIX COMPLETE! The completed column error should be resolved.' as status;

-- Show the tasks table structure to verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;