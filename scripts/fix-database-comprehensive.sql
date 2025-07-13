-- Comprehensive Database Fix Script for Grind App
-- This script fixes foreign key constraints and ensures proper table structure

-- 1. First, let's check if the auth.users table has any users
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    RAISE NOTICE 'Found % users in auth.users table', user_count;
END $$;

-- 2. Create a function to ensure all auth users have profiles
CREATE OR REPLACE FUNCTION ensure_all_users_have_profiles()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    -- Loop through all auth users and ensure they have profiles
    FOR auth_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (
            auth_user.id,
            COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1), 'User'),
            1,
            0,
            0,
            0
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Ensured profile exists for user: %', auth_user.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Run the function to ensure all users have profiles
SELECT ensure_all_users_have_profiles();

-- 4. Verify the tasks table has the correct structure
DO $$
BEGIN
    -- Check if completed column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completed'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added completed column to tasks table';
    ELSE
        RAISE NOTICE 'completed column already exists in tasks table';
    END IF;
    
    -- Ensure all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'goal_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added goal_id column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Task';
        RAISE NOTICE 'Added title column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added due_date column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'xp_value'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 30;
        RAISE NOTICE 'Added xp_value column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'is_habit'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_habit column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'streak'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN streak INTEGER DEFAULT 0;
        RAISE NOTICE 'Added streak column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to tasks table';
    END IF;
END $$;

-- 5. Verify the goals table has the correct structure
DO $$
BEGIN
    -- Ensure all required columns exist in goals table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to goals table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Goal';
        RAISE NOTICE 'Added title column to goals table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to goals table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'deadline'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deadline column to goals table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column to goals table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 6. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Test the foreign key relationships
DO $$
DECLARE
    test_user_id UUID;
    test_goal_id UUID;
    test_task_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', test_user_id;
        
        -- Test goal creation
        INSERT INTO public.goals (user_id, title, description)
        VALUES (test_user_id, 'Test Goal - Foreign Key Check', 'Testing foreign key relationships')
        RETURNING id INTO test_goal_id;
        
        RAISE NOTICE 'Successfully created test goal with ID: %', test_goal_id;
        
        -- Test task creation
        INSERT INTO public.tasks (user_id, goal_id, title, description, completed)
        VALUES (test_user_id, test_goal_id, 'Test Task - Foreign Key Check', 'Testing foreign key relationships', false)
        RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Successfully created test task with ID: %', test_task_id;
        
        -- Clean up test data
        DELETE FROM public.tasks WHERE id = test_task_id;
        DELETE FROM public.goals WHERE id = test_goal_id;
        
        RAISE NOTICE 'Foreign key relationships are working correctly!';
    ELSE
        RAISE NOTICE 'No users found in auth.users table - cannot test foreign key relationships';
    END IF;
END $$;

-- 8. Display final table structures for verification
SELECT 'PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

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

-- 9. Display row counts
SELECT 'TABLE ROW COUNTS:' as info;
SELECT 
    'auth.users' as table_name, 
    COUNT(*) as row_count 
FROM auth.users
UNION ALL
SELECT 
    'public.profiles' as table_name, 
    COUNT(*) as row_count 
FROM public.profiles
UNION ALL
SELECT 
    'public.goals' as table_name, 
    COUNT(*) as row_count 
FROM public.goals
UNION ALL
SELECT 
    'public.tasks' as table_name, 
    COUNT(*) as row_count 
FROM public.tasks;

SELECT 'Database fix completed successfully!' as status;