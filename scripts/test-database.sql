-- Test script to verify database setup
-- Run this after running the main database-setup.sql script

-- Test 1: Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'goals', 'milestones', 'tasks', 'journal_entries') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'goals', 'milestones', 'tasks', 'journal_entries')
ORDER BY table_name;

-- Test 2: Check foreign key constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
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
  AND tc.table_name IN ('goals', 'tasks', 'milestones', 'journal_entries')
ORDER BY tc.table_name, tc.constraint_name;

-- Test 3: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 4: Check if functions exist
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN ('handle_new_user', 'handle_updated_at', 'check_user_exists', 'exec_sql') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'handle_updated_at', 'check_user_exists', 'exec_sql')
ORDER BY routine_name;

-- Test 5: Check triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

SELECT 'Database verification completed!' as result;