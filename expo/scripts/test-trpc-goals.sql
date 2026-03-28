-- Test script to verify goals table schema and create a demo user for testing

-- First, let's check the current goals table structure
SELECT 'CURRENT GOALS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

-- Check if we have any users in auth.users
SELECT 'AUTH USERS COUNT:' as info;
SELECT COUNT(*) as user_count FROM auth.users;

-- Create a demo user if none exists (for development testing)
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

-- Test goal creation with all required columns
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
        'Test Ultimate Goal',
        'This is a test goal to verify schema compatibility',
        (CURRENT_TIMESTAMP + INTERVAL '30 days'),
        'fitness',
        100,
        'workouts',
        'high',
        '#FF6B6B',
        'https://example.com/image.jpg',
        'active'
    )
    RETURNING id INTO test_goal_id;
    
    RAISE NOTICE 'Successfully created test goal with ID: %', test_goal_id;
    
    -- Verify the goal was created correctly
    IF EXISTS (SELECT 1 FROM public.goals WHERE id = test_goal_id) THEN
        RAISE NOTICE 'Test goal verified in database';
        
        -- Show the created goal
        RAISE NOTICE 'Goal details: %', (
            SELECT row_to_json(g) FROM (
                SELECT title, description, category, target_value, unit, priority, status
                FROM public.goals 
                WHERE id = test_goal_id
            ) g
        );
    ELSE
        RAISE NOTICE 'ERROR: Test goal not found after creation';
    END IF;
    
    -- Clean up test goal
    DELETE FROM public.goals WHERE id = test_goal_id;
    RAISE NOTICE 'Cleaned up test goal';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR creating test goal: %', SQLERRM;
        RAISE NOTICE 'This indicates missing columns in the goals table';
END $$;

-- Show final verification
SELECT 'SCHEMA VERIFICATION COMPLETE' as status;
SELECT 'If you see any errors above, run the fix-goals-table-schema.sql script first' as note;