-- Database Health Check Script for Grind App
-- Run this script to verify that all tables and relationships are working correctly

-- 1. Check if all required tables exist
SELECT 'CHECKING TABLE EXISTENCE:' as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
        THEN '✅ profiles table exists'
        ELSE '❌ profiles table missing'
    END as profiles_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') 
        THEN '✅ goals table exists'
        ELSE '❌ goals table missing'
    END as goals_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') 
        THEN '✅ tasks table exists'
        ELSE '❌ tasks table missing'
    END as tasks_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entries') 
        THEN '✅ journal_entries table exists'
        ELSE '❌ journal_entries table missing'
    END as journal_check;

-- 2. Check if required columns exist in tasks table
SELECT 'CHECKING TASKS TABLE COLUMNS:' as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'completed') 
        THEN '✅ tasks.completed column exists'
        ELSE '❌ tasks.completed column missing'
    END as completed_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id') 
        THEN '✅ tasks.user_id column exists'
        ELSE '❌ tasks.user_id column missing'
    END as user_id_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'goal_id') 
        THEN '✅ tasks.goal_id column exists'
        ELSE '❌ tasks.goal_id column missing'
    END as goal_id_check;

-- 3. Check foreign key constraints
SELECT 'CHECKING FOREIGN KEY CONSTRAINTS:' as status;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ Foreign key constraint exists' as status
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('goals', 'tasks', 'journal_entries', 'milestones');

-- 4. Check if auth users have corresponding profiles
SELECT 'CHECKING USER-PROFILE RELATIONSHIP:' as status;

WITH user_profile_check AS (
    SELECT 
        au.id as auth_user_id,
        au.email,
        p.id as profile_id,
        p.name as profile_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
)
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(profile_id) as users_with_profiles,
    COUNT(*) - COUNT(profile_id) as users_missing_profiles
FROM user_profile_check;

-- 5. Show sample data counts
SELECT 'DATA COUNTS:' as status;

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
FROM public.tasks
UNION ALL
SELECT 
    'public.journal_entries' as table_name,
    COUNT(*) as row_count
FROM public.journal_entries;

-- 6. Test basic operations (if there are users)
DO $$
DECLARE
    test_user_id UUID;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    IF user_count > 0 THEN
        SELECT id INTO test_user_id FROM auth.users LIMIT 1;
        
        -- Test profile upsert
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (test_user_id, 'Test User', 1, 0, 0, 0)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        
        RAISE NOTICE '✅ Profile upsert test successful';
        
        -- Test goal creation
        INSERT INTO public.goals (user_id, title, description)
        VALUES (test_user_id, 'Test Goal', 'Test Description')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Goal creation test successful';
        
        -- Clean up test goal
        DELETE FROM public.goals WHERE user_id = test_user_id AND title = 'Test Goal';
        
    ELSE
        RAISE NOTICE 'ℹ️ No auth users found - skipping operation tests';
    END IF;
END $$;

SELECT '✅ Database health check completed!' as final_status;