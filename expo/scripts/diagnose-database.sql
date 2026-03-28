-- Database Diagnostic Script
-- Run this to check the current state of your database

-- Check if tables exist
SELECT 
    'Table Existence Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
        THEN '✓ profiles table exists'
        ELSE '✗ profiles table missing'
    END as profiles_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') 
        THEN '✓ goals table exists'
        ELSE '✗ goals table missing'
    END as goals_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') 
        THEN '✓ tasks table exists'
        ELSE '✗ tasks table missing'
    END as tasks_status;

-- Check tasks table columns specifically
SELECT 
    'Tasks Table Columns' as check_type,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as existing_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks';

-- Check for the specific 'completed' column that was causing issues
SELECT 
    'Completed Column Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'completed'
        ) 
        THEN '✓ completed column exists in tasks table'
        ELSE '✗ completed column missing from tasks table - RUN scripts/verify-and-fix-schema.sql'
    END as completed_column_status;

-- Check RLS policies
SELECT 
    'RLS Policies Check' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN tablename = 'tasks' THEN 1 END) as tasks_policies,
    COUNT(CASE WHEN tablename = 'goals' THEN 1 END) as goals_policies,
    COUNT(CASE WHEN tablename = 'profiles' THEN 1 END) as profiles_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Check foreign key constraints
SELECT 
    'Foreign Key Constraints' as check_type,
    tc.table_name,
    tc.constraint_name,
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
ORDER BY tc.table_name;

-- Final status
SELECT 
    'DIAGNOSIS COMPLETE' as status,
    'If you see any ✗ marks above, run the appropriate fix scripts' as next_steps;