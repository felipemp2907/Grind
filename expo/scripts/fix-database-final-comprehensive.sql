-- FINAL COMPREHENSIVE DATABASE FIX
-- This script ensures all required columns exist and fixes schema cache issues
-- Run this in your Supabase SQL Editor

BEGIN;

-- First, let's check what columns currently exist
SELECT 'CURRENT GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

-- Add missing columns to goals table with proper error handling
DO $$ 
BEGIN
    -- Add category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'category') THEN
        ALTER TABLE public.goals ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category column to goals table';
    ELSE
        RAISE NOTICE 'Category column already exists in goals table';
    END IF;

    -- Add target_value column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'target_value') THEN
        ALTER TABLE public.goals ADD COLUMN target_value INTEGER DEFAULT 100;
        RAISE NOTICE 'Added target_value column to goals table';
    ELSE
        RAISE NOTICE 'Target_value column already exists in goals table';
    END IF;

    -- Add unit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'unit') THEN
        ALTER TABLE public.goals ADD COLUMN unit TEXT DEFAULT '';
        RAISE NOTICE 'Added unit column to goals table';
    ELSE
        RAISE NOTICE 'Unit column already exists in goals table';
    END IF;

    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'priority') THEN
        ALTER TABLE public.goals ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column to goals table';
    ELSE
        RAISE NOTICE 'Priority column already exists in goals table';
    END IF;

    -- Add color column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'color') THEN
        ALTER TABLE public.goals ADD COLUMN color TEXT;
        RAISE NOTICE 'Added color column to goals table';
    ELSE
        RAISE NOTICE 'Color column already exists in goals table';
    END IF;

    -- Add cover_image column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'cover_image') THEN
        ALTER TABLE public.goals ADD COLUMN cover_image TEXT;
        RAISE NOTICE 'Added cover_image column to goals table';
    ELSE
        RAISE NOTICE 'Cover_image column already exists in goals table';
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'status') THEN
        ALTER TABLE public.goals ADD COLUMN status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';
        RAISE NOTICE 'Added status column to goals table';
    ELSE
        RAISE NOTICE 'Status column already exists in goals table';
    END IF;
END $$;

-- Now fix the tasks table
DO $$ 
BEGIN
    -- Add type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE public.tasks ADD COLUMN type TEXT CHECK (type IN ('regular', 'streak', 'milestone', 'today')) DEFAULT 'regular';
        RAISE NOTICE 'Added type column to tasks table';
    ELSE
        RAISE NOTICE 'Type column already exists in tasks table';
    END IF;

    -- Add task_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'task_date') THEN
        ALTER TABLE public.tasks ADD COLUMN task_date DATE;
        RAISE NOTICE 'Added task_date column to tasks table';
    ELSE
        RAISE NOTICE 'Task_date column already exists in tasks table';
    END IF;

    -- Add xp_value column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'xp_value') THEN
        ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 10;
        RAISE NOTICE 'Added xp_value column to tasks table';
    ELSE
        RAISE NOTICE 'Xp_value column already exists in tasks table';
    END IF;

    -- Ensure is_habit column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'is_habit') THEN
        ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_habit column to tasks table';
    ELSE
        RAISE NOTICE 'Is_habit column already exists in tasks table';
    END IF;
END $$;

-- Update existing records to have default values
UPDATE public.goals SET status = 'active' WHERE status IS NULL;
UPDATE public.goals SET target_value = 100 WHERE target_value IS NULL;
UPDATE public.goals SET unit = '' WHERE unit IS NULL;
UPDATE public.goals SET priority = 'medium' WHERE priority IS NULL;

UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON public.tasks(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit ON public.tasks(is_habit);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);

COMMIT;

-- Force schema cache refresh for PostgREST/Supabase
-- This is crucial to ensure Supabase recognizes the new columns
NOTIFY pgrst, 'reload schema';

-- Alternative method to refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Wait a moment and then refresh again
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Database schema updated successfully! Schema cache refreshed.' as status;

-- Display final table structures
SELECT 'FINAL GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'FINAL TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Test that we can insert a goal with all columns
INSERT INTO public.goals (
    user_id, title, description, deadline, category, target_value, 
    unit, priority, color, cover_image, status
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Test Goal', 
    'Test Description', 
    NOW() + INTERVAL '30 days',
    'test',
    100,
    'points',
    'medium',
    '#FF0000',
    'https://example.com/image.jpg',
    'active'
) ON CONFLICT DO NOTHING;

SELECT 'Test goal insertion successful!' as test_result;

-- Clean up test goal
DELETE FROM public.goals WHERE title = 'Test Goal' AND user_id = '00000000-0000-0000-0000-000000000000';