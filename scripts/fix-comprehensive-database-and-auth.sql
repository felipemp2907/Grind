-- COMPREHENSIVE DATABASE AND AUTHENTICATION FIX
-- This script fixes all database schema issues and authentication problems
-- Run this COMPLETE script in your Supabase SQL Editor

-- 1. First, let's add missing columns to existing tables
-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

-- Add missing columns to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS progress_value INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;

-- Add missing columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'today' CHECK (type IN ('today', 'streak')),
ADD COLUMN IF NOT EXISTS task_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'));

-- 2. Create demo user in auth.users if it doesn't exist
-- This is a special function that bypasses normal auth restrictions
CREATE OR REPLACE FUNCTION create_demo_user()
RETURNS void AS $$
BEGIN
  -- Insert demo user into auth.users if it doesn't exist
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    'demo-user-id'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@example.com',
    crypt('demo123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Demo User", "full_name": "Demo User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Demo user created or already exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create demo user
SELECT create_demo_user();

-- 3. Create demo user profile
INSERT INTO public.profiles (
  id,
  name,
  level,
  xp,
  streak_days,
  longest_streak,
  experience_level,
  created_at,
  updated_at
) VALUES (
  'demo-user-id'::uuid,
  'Demo User',
  1,
  0,
  0,
  0,
  'beginner',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  experience_level = EXCLUDED.experience_level,
  updated_at = NOW();

-- 4. Update the ensure_user_profile function to handle all required columns
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update profile with all required columns
  INSERT INTO public.profiles (
    id, 
    name, 
    level, 
    xp, 
    streak_days, 
    longest_streak,
    experience_level,
    created_at,
    updated_at
  )
  VALUES (
    user_id, 
    user_name, 
    1, 
    0, 
    0, 
    0,
    'beginner',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    experience_level = COALESCE(EXCLUDED.experience_level, profiles.experience_level),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies to allow demo user access
-- Create a special policy for demo user
CREATE POLICY IF NOT EXISTS "Demo user can access all profiles"
  ON public.profiles
  FOR ALL
  USING (id = 'demo-user-id'::uuid)
  WITH CHECK (id = 'demo-user-id'::uuid);

CREATE POLICY IF NOT EXISTS "Demo user can access all goals"
  ON public.goals
  FOR ALL
  USING (user_id = 'demo-user-id'::uuid)
  WITH CHECK (user_id = 'demo-user-id'::uuid);

CREATE POLICY IF NOT EXISTS "Demo user can access all tasks"
  ON public.tasks
  FOR ALL
  USING (user_id = 'demo-user-id'::uuid)
  WITH CHECK (user_id = 'demo-user-id'::uuid);

CREATE POLICY IF NOT EXISTS "Demo user can access all journal entries"
  ON public.journal_entries
  FOR ALL
  USING (user_id = 'demo-user-id'::uuid)
  WITH CHECK (user_id = 'demo-user-id'::uuid);

CREATE POLICY IF NOT EXISTS "Demo user can access all milestones"
  ON public.milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = 'demo-user-id'::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = 'demo-user-id'::uuid
    )
  );

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_type ON public.tasks(user_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_task_date ON public.tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_due_date ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id_status ON public.goals(user_id, status);

-- 7. Clean up any orphaned data
DELETE FROM public.tasks WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.goals WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 8. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 9. Test the setup
DO $$
DECLARE
    profile_count INTEGER;
    goal_count INTEGER;
    task_count INTEGER;
BEGIN
    -- Check if demo user profile exists
    SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE id = 'demo-user-id'::uuid;
    
    IF profile_count = 0 THEN
        RAISE EXCEPTION 'Demo user profile was not created!';
    END IF;
    
    -- Test goal creation
    INSERT INTO public.goals (
        user_id,
        title,
        description,
        deadline,
        status,
        category,
        priority
    ) VALUES (
        'demo-user-id'::uuid,
        'Test Goal',
        'This is a test goal to verify the setup',
        NOW() + INTERVAL '30 days',
        'active',
        'test',
        'medium'
    ) ON CONFLICT DO NOTHING;
    
    -- Test task creation
    INSERT INTO public.tasks (
        user_id,
        goal_id,
        title,
        description,
        type,
        task_date,
        is_habit,
        xp_value,
        priority
    ) SELECT 
        'demo-user-id'::uuid,
        g.id,
        'Test Task',
        'This is a test task',
        'streak',
        CURRENT_DATE,
        true,
        30,
        'medium'
    FROM public.goals g 
    WHERE g.user_id = 'demo-user-id'::uuid 
    AND g.title = 'Test Goal'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- Verify counts
    SELECT COUNT(*) INTO goal_count FROM public.goals WHERE user_id = 'demo-user-id'::uuid;
    SELECT COUNT(*) INTO task_count FROM public.tasks WHERE user_id = 'demo-user-id'::uuid;
    
    RAISE NOTICE 'Setup verification complete:';
    RAISE NOTICE '- Demo user profile: % found', profile_count;
    RAISE NOTICE '- Demo user goals: % found', goal_count;
    RAISE NOTICE '- Demo user tasks: % found', task_count;
    
    -- Clean up test data
    DELETE FROM public.tasks WHERE user_id = 'demo-user-id'::uuid AND title = 'Test Task';
    DELETE FROM public.goals WHERE user_id = 'demo-user-id'::uuid AND title = 'Test Goal';
    
    RAISE NOTICE 'Test data cleaned up successfully';
END $$;

-- 10. Display final table structures
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

-- 11. Final success message
SELECT 'COMPREHENSIVE DATABASE AND AUTH FIX COMPLETED SUCCESSFULLY!' as final_status;
SELECT 'You can now use the app with the demo user. tRPC procedures should work correctly.' as instructions;
SELECT 'Demo user ID: demo-user-id' as demo_info;