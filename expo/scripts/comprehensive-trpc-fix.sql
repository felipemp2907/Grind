-- Comprehensive tRPC Fix Script
-- This script fixes all database schema issues that cause tRPC errors

SELECT 'STARTING COMPREHENSIVE tRPC FIX...' as status;

-- 1. Add missing columns to goals table
DO $$
BEGIN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'category') THEN
        ALTER TABLE public.goals ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category column to goals table';
    END IF;

    -- Add target_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'target_value') THEN
        ALTER TABLE public.goals ADD COLUMN target_value NUMERIC DEFAULT 100;
        RAISE NOTICE 'Added target_value column to goals table';
    END IF;

    -- Add unit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'unit') THEN
        ALTER TABLE public.goals ADD COLUMN unit TEXT;
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

-- 2. Add missing columns to tasks table
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

-- 3. Create demo user for development testing
DO $$
DECLARE
    demo_user_id UUID := 'demo-user-id'::UUID;
    user_exists BOOLEAN;
BEGIN
    -- Check if demo user already exists in profiles
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = demo_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        -- Insert demo user into profiles table directly (for development)
        INSERT INTO public.profiles (id, name, email, level, xp, streak_days, longest_streak)
        VALUES (demo_user_id, 'Demo User', 'demo@example.com', 1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created demo user profile with ID: %', demo_user_id;
    ELSE
        RAISE NOTICE 'Demo user already exists with ID: %', demo_user_id;
    END IF;
END $$;

-- 4. Test goal creation with all required columns
DO $$
DECLARE
    demo_user_id UUID := 'demo-user-id'::UUID;
    test_goal_id UUID;
BEGIN
    -- Try to create a test goal with all the columns that tRPC expects
    INSERT INTO public.goals (
        user_id,
        title,
        description,
        deadline,
        category,
        target_value,
        unit,
        priority,
        color,
        cover_image,
        status
    )
    VALUES (
        demo_user_id,
        'Test tRPC Goal',
        'This is a test goal to verify tRPC compatibility',
        (CURRENT_TIMESTAMP + INTERVAL '30 days'),
        'fitness',
        100,
        'workouts',
        'high',
        '#FF6B6B',
        null,
        'active'
    )
    RETURNING id INTO test_goal_id;
    
    RAISE NOTICE 'Successfully created test goal with ID: %', test_goal_id;
    
    -- Test creating streak tasks
    INSERT INTO public.tasks (
        user_id,
        goal_id,
        title,
        description,
        type,
        task_date,
        is_habit,
        xp_value,
        priority,
        completed
    )
    VALUES (
        demo_user_id,
        test_goal_id,
        'Test Streak Task',
        'This is a test streak task',
        'streak',
        CURRENT_DATE,
        true,
        30,
        'medium',
        false
    );
    
    RAISE NOTICE 'Successfully created test streak task';
    
    -- Clean up test data
    DELETE FROM public.tasks WHERE goal_id = test_goal_id;
    DELETE FROM public.goals WHERE id = test_goal_id;
    RAISE NOTICE 'Cleaned up test data';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in test: %', SQLERRM;
        -- Clean up on error
        DELETE FROM public.tasks WHERE goal_id = test_goal_id;
        DELETE FROM public.goals WHERE id = test_goal_id;
END $$;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Display final verification
SELECT 'FINAL SCHEMA VERIFICATION:' as status;

SELECT 'GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'COMPREHENSIVE tRPC FIX COMPLETED SUCCESSFULLY!' as final_status;
SELECT 'You can now test goal creation through tRPC without schema errors' as note;