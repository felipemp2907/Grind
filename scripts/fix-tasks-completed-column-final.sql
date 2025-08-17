-- FINAL FIX FOR TASKS TABLE - ADD MISSING COMPLETED COLUMN
-- This script adds the missing 'completed' column and other required columns to the tasks table
-- Run this in your Supabase SQL Editor

BEGIN;

-- Check current tasks table structure
SELECT 'CURRENT TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Add all missing columns to tasks table
DO $$ 
BEGIN
    -- Add completed column (CRITICAL - this is what's causing the error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'completed') THEN
        ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added completed column to tasks table';
    ELSE
        RAISE NOTICE 'Completed column already exists in tasks table';
    END IF;

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

    -- Add due_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'due_at') THEN
        ALTER TABLE public.tasks ADD COLUMN due_at TIMESTAMPTZ;
        RAISE NOTICE 'Added due_at column to tasks table';
    ELSE
        RAISE NOTICE 'Due_at column already exists in tasks table';
    END IF;

    -- Add load_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'load_score') THEN
        ALTER TABLE public.tasks ADD COLUMN load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);
        RAISE NOTICE 'Added load_score column to tasks table';
    ELSE
        RAISE NOTICE 'Load_score column already exists in tasks table';
    END IF;

    -- Add proof_mode column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'proof_mode') THEN
        ALTER TABLE public.tasks ADD COLUMN proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));
        RAISE NOTICE 'Added proof_mode column to tasks table';
    ELSE
        RAISE NOTICE 'Proof_mode column already exists in tasks table';
    END IF;

    -- Add xp_value column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'xp_value') THEN
        ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 10;
        RAISE NOTICE 'Added xp_value column to tasks table';
    ELSE
        RAISE NOTICE 'Xp_value column already exists in tasks table';
    END IF;

    -- Add is_habit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'is_habit') THEN
        ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_habit column to tasks table';
    ELSE
        RAISE NOTICE 'Is_habit column already exists in tasks table';
    END IF;

    -- Add completed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMPTZ;
        RAISE NOTICE 'Added completed_at column to tasks table';
    ELSE
        RAISE NOTICE 'Completed_at column already exists in tasks table';
    END IF;
END $$;

-- Add constraint to ensure proper task type structure
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_shape;
        RAISE NOTICE 'Dropped existing tasks_type_shape constraint';
    END IF;
    
    -- Add new constraint
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK(
        (type='streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
        (type='today' AND task_date IS NULL AND due_at IS NOT NULL) OR
        (type IN ('regular', 'milestone'))
    );
    RAISE NOTICE 'Added tasks_type_shape constraint';
END $$;

-- Update existing records to have default values
UPDATE public.tasks SET completed = FALSE WHERE completed IS NULL;
UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;
UPDATE public.tasks SET load_score = 1 WHERE load_score IS NULL;
UPDATE public.tasks SET proof_mode = 'flex' WHERE proof_mode IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON public.tasks(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit ON public.tasks(is_habit);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);

COMMIT;

-- Force schema cache refresh for PostgREST/Supabase
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Tasks table schema updated successfully! The completed column has been added.' as status;

-- Display final table structure
SELECT 'FINAL TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Test that we can insert a task with all columns
INSERT INTO public.tasks (
    user_id, goal_id, title, description, type, task_date, due_at,
    load_score, proof_mode, xp_value, is_habit, completed
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001', 
    'Test Task', 
    'Test Description',
    'streak',
    CURRENT_DATE,
    NULL,
    2,
    'flex',
    20,
    TRUE,
    FALSE
) ON CONFLICT DO NOTHING;

SELECT 'Test task insertion successful!' as test_result;

-- Clean up test task
DELETE FROM public.tasks WHERE title = 'Test Task' AND user_id = '00000000-0000-0000-0000-000000000000';