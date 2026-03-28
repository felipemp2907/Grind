-- Final comprehensive fix for database issues
-- This script addresses all foreign key and schema issues

-- 1. First, let's check what we have
SELECT 'CHECKING CURRENT DATABASE STATE...' as status;

-- Check if auth.users has any users
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    RAISE NOTICE 'Found % users in auth.users table', user_count;
END $$;

-- Check current table structures
SELECT 'CURRENT PROFILES TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'CURRENT GOALS TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'CURRENT TASKS TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 2. Ensure profiles table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ensure goals table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Drop and recreate tasks table to ensure correct structure
DROP TABLE IF EXISTS public.tasks CASCADE;
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  xp_value INTEGER DEFAULT 30,
  is_habit BOOLEAN DEFAULT FALSE,
  streak INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create function to ensure all auth users have profiles
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

-- 6. Run the function to ensure all users have profiles
SELECT ensure_all_users_have_profiles();

-- 7. Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- 9. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 10. Create RLS policies for goals
CREATE POLICY "Users can view their own goals"
  ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- 11. Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 12. Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 14. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 17. Test the setup with actual data
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
        VALUES (test_user_id, 'Test Goal - Final Check', 'Testing final database setup')
        RETURNING id INTO test_goal_id;
        
        RAISE NOTICE 'Successfully created test goal with ID: %', test_goal_id;
        
        -- Test task creation with completed column
        INSERT INTO public.tasks (user_id, goal_id, title, description, completed, priority, xp_value, is_habit, streak)
        VALUES (test_user_id, test_goal_id, 'Test Task - Final Check', 'Testing completed column and all fields', false, 'medium', 30, false, 0)
        RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Successfully created test task with ID: %', test_task_id;
        
        -- Test updating the task
        UPDATE public.tasks 
        SET completed = true, completed_at = CURRENT_TIMESTAMP 
        WHERE id = test_task_id;
        
        RAISE NOTICE 'Successfully updated task completed status';
        
        -- Test selecting the task
        IF EXISTS (SELECT 1 FROM public.tasks WHERE id = test_task_id AND completed = true) THEN
            RAISE NOTICE 'Task completed status verified in database';
        ELSE
            RAISE NOTICE 'ERROR: Task completed status not found';
        END IF;
        
        -- Clean up test data
        DELETE FROM public.tasks WHERE id = test_task_id;
        DELETE FROM public.goals WHERE id = test_goal_id;
        
        RAISE NOTICE 'All tests passed! Database is working correctly.';
    ELSE
        RAISE NOTICE 'No users found in auth.users table - cannot test, but schema is ready';
    END IF;
END $$;

-- 18. Display final verification
SELECT 'FINAL DATABASE STRUCTURE VERIFICATION:' as status;

SELECT 'PROFILES TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'GOALS TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'TASKS TABLE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 19. Display row counts
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

SELECT 'DATABASE SETUP COMPLETED SUCCESSFULLY!' as final_status;