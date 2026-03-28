-- Simple database schema fix for missing columns
-- Run this in your Supabase SQL editor

BEGIN;

-- Add missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
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

-- Update existing records to have default values
UPDATE public.tasks SET completed = FALSE WHERE completed IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET streak = 0 WHERE streak IS NULL;
UPDATE public.tasks SET priority = 'medium' WHERE priority IS NULL;
UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET load_score = 1 WHERE load_score IS NULL;
UPDATE public.tasks SET proof_mode = 'flex' WHERE proof_mode IS NULL;

-- Add missing columns to goals table
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

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMIT;

-- Force schema refresh
NOTIFY pgrst, 'reload schema';

SELECT 'Database schema fixed successfully!' as status;