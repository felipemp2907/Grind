-- Fix Goals Table Schema
-- This script adds all missing columns to the goals table

-- Add missing columns to goals table
DO $$
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'category') THEN
        ALTER TABLE public.goals ADD COLUMN category TEXT DEFAULT '';
        RAISE NOTICE 'Added category column to goals table';
    END IF;

    -- Add target_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'target_value') THEN
        ALTER TABLE public.goals ADD COLUMN target_value NUMERIC DEFAULT 100;
        RAISE NOTICE 'Added target_value column to goals table';
    END IF;

    -- Add unit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'unit') THEN
        ALTER TABLE public.goals ADD COLUMN unit TEXT DEFAULT '';
        RAISE NOTICE 'Added unit column to goals table';
    END IF;

    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'priority') THEN
        ALTER TABLE public.goals ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column to goals table';
    END IF;

    -- Add color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'color') THEN
        ALTER TABLE public.goals ADD COLUMN color TEXT;
        RAISE NOTICE 'Added color column to goals table';
    END IF;

    -- Add cover_image column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'cover_image') THEN
        ALTER TABLE public.goals ADD COLUMN cover_image TEXT;
        RAISE NOTICE 'Added cover_image column to goals table';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') THEN
        ALTER TABLE public.goals ADD COLUMN status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active';
        RAISE NOTICE 'Added status column to goals table';
    END IF;
END $$;

-- Add missing columns to tasks table
DO $$
BEGIN
    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE public.tasks ADD COLUMN type TEXT DEFAULT 'regular';
        RAISE NOTICE 'Added type column to tasks table';
    END IF;

    -- Add task_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_date') THEN
        ALTER TABLE public.tasks ADD COLUMN task_date DATE;
        RAISE NOTICE 'Added task_date column to tasks table';
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT 'GOALS TABLE COLUMNS AFTER FIX:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'TASKS TABLE COLUMNS AFTER FIX:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'Goals table schema fix completed successfully!' as status;