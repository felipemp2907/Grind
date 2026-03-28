-- Idempotent database schema fixes for batch planner
-- Run this to ensure all required columns exist

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak','today'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INT DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex','realtime'));

-- Add constraint to ensure proper task shape
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK(
      (type='streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type='today' AND task_date IS NULL AND due_at IS NOT NULL)
    );
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);

-- Ensure RLS policies allow service role to insert tasks
-- This is needed for batch seeding
DO $$
BEGIN
  -- Check if the policy exists and create/update it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'service_role_all_access'
  ) THEN
    CREATE POLICY service_role_all_access ON public.tasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure profiles table has proper RLS for user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'service_role_all_access'
  ) THEN
    CREATE POLICY service_role_all_access ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Create or replace function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_email TEXT DEFAULT NULL, user_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE id = user_id;
  
  -- If profile doesn't exist, create it
  IF profile_id IS NULL THEN
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (
      user_id,
      COALESCE(user_name, user_email, 'User'),
      user_email,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW()
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO service_role;

COMMIT;