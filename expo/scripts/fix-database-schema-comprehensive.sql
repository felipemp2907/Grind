-- Comprehensive Database Schema Update for Full Batch Planning
-- This script aligns the database with the new batch planning system

BEGIN;

-- First, add missing columns to tasks table if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Ensure xp_value column exists and has correct name
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'xp_value') THEN
    ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 30;
  END IF;
END$;

-- Add experience_level to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner';

-- Add status column to goals if it doesn't exist
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;

-- Create constraint to ensure proper task type structure
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
      (type='streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type='today' AND task_date IS NULL AND due_at IS NOT NULL) OR
      (type IS NULL) -- Allow existing tasks without type
    );
  END IF;
END$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, (due_at::date));
CREATE INDEX IF NOT EXISTS idx_tasks_user_type ON public.tasks(user_id, type);

-- Update existing tasks to have proper types
UPDATE public.tasks SET type = 'today' WHERE type IS NULL AND is_habit = FALSE;
UPDATE public.tasks SET type = 'streak' WHERE type IS NULL AND is_habit = TRUE;

-- For streak tasks, set task_date from due_date if available
UPDATE public.tasks 
SET task_date = due_date::date 
WHERE type = 'streak' AND task_date IS NULL AND due_date IS NOT NULL;

-- For today tasks, set due_at from due_date if available
UPDATE public.tasks 
SET due_at = due_date 
WHERE type = 'today' AND due_at IS NULL AND due_date IS NOT NULL;

COMMIT;

-- Create the core tables health check function
CREATE OR REPLACE FUNCTION public.grind_check_core_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE 
  result jsonb;
BEGIN
  -- Check if all required tables exist
  result := jsonb_build_object(
    'ok', (
      to_regclass('public.profiles') IS NOT NULL AND
      to_regclass('public.goals') IS NOT NULL AND
      to_regclass('public.tasks') IS NOT NULL
    ),
    'tables', jsonb_build_object(
      'profiles', to_regclass('public.profiles') IS NOT NULL,
      'goals', to_regclass('public.goals') IS NOT NULL,
      'tasks', to_regclass('public.tasks') IS NOT NULL
    ),
    'timestamp', CURRENT_TIMESTAMP
  );
  
  RETURN result;
END;
$;

-- Create a function to ensure user profile exists (for demo users)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(user_id UUID, user_name TEXT DEFAULT 'Demo User')
RETURNS BOOLEAN AS $
BEGIN
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak, experience_level)
  VALUES (user_id, user_name, 1, 0, 0, 0, 'beginner')
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to ensure they work with the new schema
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure demo user profile exists for development
DO $
BEGIN
  -- Create demo user profile if it doesn't exist
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak, experience_level)
  VALUES ('demo-user-id', 'Demo User', 1, 0, 0, 0, 'beginner')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Demo user profile ensured';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create demo user profile: %', SQLERRM;
END$;

-- Force schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');

-- Display final schema information
SELECT 'SCHEMA UPDATE COMPLETE' as status;

SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

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

-- Test the health check function
SELECT 'HEALTH CHECK RESULT:' as info;
SELECT public.grind_check_core_tables() as health_check;