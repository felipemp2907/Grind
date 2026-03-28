-- Test Database Setup
-- Run this in Supabase SQL Editor to verify your setup is working

-- Test 1: Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'goals', 'milestones', 'tasks', 'journal_entries') 
    THEN '✅ Found'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'goals', 'milestones', 'tasks', 'journal_entries')
ORDER BY table_name;

-- Test 2: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'goals', 'milestones', 'tasks', 'journal_entries');

-- Test 3: Check if policies exist
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 4: Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'handle_updated_at', 'exec_sql');

-- Test 5: Check if storage bucket exists
SELECT 
  name,
  public
FROM storage.buckets 
WHERE name = 'profiles';

-- If all tests pass, your database is set up correctly!
SELECT 'Database setup verification complete!' as result;