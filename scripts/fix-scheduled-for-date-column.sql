-- Fix scheduled_for_date column issue
-- This script adds the missing scheduled_for_date column that the database expects
-- Run this in your Supabase SQL Editor

BEGIN;

-- Add the scheduled_for_date column that the database is expecting
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS scheduled_for_date DATE;

-- Make sure all other required columns exist
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak', 'today', 'regular', 'milestone'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_date DATE;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update existing records to have default values
UPDATE public.tasks SET completed = FALSE WHERE completed IS NULL;
UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;
UPDATE public.tasks SET load_score = 1 WHERE load_score IS NULL;
UPDATE public.tasks SET proof_mode = 'flex' WHERE proof_mode IS NULL;
UPDATE public.tasks SET priority = 'medium' WHERE priority IS NULL;

-- Set scheduled_for_date from task_date or due_at for existing records
UPDATE public.tasks 
SET scheduled_for_date = task_date 
WHERE scheduled_for_date IS NULL AND task_date IS NOT NULL;

UPDATE public.tasks 
SET scheduled_for_date = due_at::date 
WHERE scheduled_for_date IS NULL AND due_at IS NOT NULL;

-- Set scheduled_for_date to today for records that still don't have it
UPDATE public.tasks 
SET scheduled_for_date = CURRENT_DATE 
WHERE scheduled_for_date IS NULL;

-- Make scheduled_for_date NOT NULL after setting default values
ALTER TABLE public.tasks 
ALTER COLUMN scheduled_for_date SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_for_date ON public.tasks(scheduled_for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled ON public.tasks(user_id, scheduled_for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_scheduled ON public.tasks(goal_id, scheduled_for_date);

COMMIT;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'scheduled_for_date column added successfully!' as status;

-- Display updated table structure
SELECT 'UPDATED TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;