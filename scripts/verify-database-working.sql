-- Quick verification script to check if database is working
-- Run this after the main fix script to verify everything is working

-- 1. Check table existence and structure
SELECT 'VERIFYING DATABASE SETUP...' as status;

-- Check if all required tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
        THEN '✓ profiles table exists'
        ELSE '✗ profiles table missing'
    END as profiles_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') 
        THEN '✓ goals table exists'
        ELSE '✗ goals table missing'
    END as goals_check
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') 
        THEN '✓ tasks table exists'
        ELSE '✗ tasks table missing'
    END as tasks_check;

-- 2. Check if completed column exists in tasks table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'completed'
        ) 
        THEN '✓ completed column exists in tasks table'
        ELSE '✗ completed column missing from tasks table'
    END as completed_column_check;

-- 3. Check if all required columns exist in tasks table
SELECT 'TASKS TABLE COLUMN CHECK:' as info;
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('id', 'user_id', 'title', 'completed', 'due_date', 'priority', 'xp_value', 'is_habit', 'streak', 'created_at', 'updated_at') 
        THEN '✓ Required'
        ELSE '- Optional'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 4. Check foreign key constraints
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('profiles', 'goals', 'tasks')
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Check RLS policies
SELECT 'ROW LEVEL SECURITY POLICIES:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'goals', 'tasks')
ORDER BY tablename, policyname;

-- 6. Test basic operations (if users exist)
DO $$
DECLARE
    user_count INTEGER;
    test_user_id UUID;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    IF user_count > 0 THEN
        SELECT id INTO test_user_id FROM auth.users LIMIT 1;
        
        -- Test if we can insert a task with completed column
        BEGIN
            INSERT INTO public.tasks (user_id, title, description, completed)
            VALUES (test_user_id, 'Verification Test Task', 'Testing completed column', false);
            
            RAISE NOTICE '✓ Successfully inserted task with completed column';
            
            -- Clean up
            DELETE FROM public.tasks WHERE title = 'Verification Test Task';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Failed to insert task: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No users found - skipping insert test';
    END IF;
END $$;

-- 7. Final status
SELECT 'VERIFICATION COMPLETE!' as status;
SELECT 'If you see ✓ marks above, your database is ready to use.' as message;