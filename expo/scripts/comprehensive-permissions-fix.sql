-- ========================================
-- COMPREHENSIVE DATABASE PERMISSIONS FIX
-- ========================================
-- 
-- This script fixes all permission denied errors by:
-- 1. Ensuring all required columns exist
-- 2. Fixing RLS policies with proper permissions
-- 3. Adding service role bypass for backend operations
-- 
-- Run this in your Supabase SQL Editor
--

BEGIN;

-- 1. Add all missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak', 'today'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_for_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Ensure goals table has required columns
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 3. Ensure profiles table has required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 4. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Service role can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow service role full access" ON public.tasks;
DROP POLICY IF EXISTS "Service role full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;

DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Service role can manage all goals" ON public.goals;
DROP POLICY IF EXISTS "Allow service role full access" ON public.goals;
DROP POLICY IF EXISTS "Service role full access goals" ON public.goals;
DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- 6. Create comprehensive RLS policies for TASKS table
-- Allow service role (backend) full access
CREATE POLICY "Service role full access tasks" ON public.tasks
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Allow authenticated users to manage their own tasks
CREATE POLICY "Users manage own tasks" ON public.tasks
    FOR ALL USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 7. Create comprehensive RLS policies for GOALS table
-- Allow service role (backend) full access
CREATE POLICY "Service role full access goals" ON public.goals
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Allow authenticated users to manage their own goals
CREATE POLICY "Users manage own goals" ON public.goals
    FOR ALL USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 8. Create comprehensive RLS policies for PROFILES table
-- Allow service role (backend) full access
CREATE POLICY "Service role full access profiles" ON public.profiles
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Allow authenticated users to manage their own profile
CREATE POLICY "Users manage own profile" ON public.profiles
    FOR ALL USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- 9. Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, level, xp, streak_days, longest_streak, experience_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
        1,
        0,
        0,
        0,
        'beginner'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();

-- 11. Create RPC function for ensuring user profile (with service role access)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_rpc(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Insert or update profile
    INSERT INTO public.profiles (id, full_name, level, xp, streak_days, longest_streak, experience_level)
    VALUES (user_id, user_name, 1, 0, 0, 0, 'beginner')
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant necessary permissions to service role
GRANT ALL ON public.tasks TO service_role;
GRANT ALL ON public.goals TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_rpc(UUID, TEXT) TO service_role;

-- 13. Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.goals TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_rpc(UUID, TEXT) TO authenticated;

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_for_date);

COMMIT;

-- Verify the fix
SELECT 'RLS permissions fix completed successfully' AS status;

-- Test the policies by showing current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('tasks', 'goals', 'profiles')
ORDER BY tablename, policyname;