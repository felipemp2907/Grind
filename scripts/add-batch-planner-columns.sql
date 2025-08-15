-- Migration: Add batch planner columns to tasks table
-- Run this in Supabase SQL Editor to add required columns for batch task planning

-- Add missing columns to tasks table (idempotent - won't fail if columns exist)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak', 'today'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped'));

-- Add compatibility columns for existing code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

-- Update full_name from name for existing profiles
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Add computed column for completed status (for backward compatibility)
-- This creates a virtual column that returns true when status = 'completed'
-- Note: We can't use GENERATED ALWAYS AS because it conflicts with existing completed column
-- Instead, we'll update the existing completed column based on status

-- Create function to sync completed status
CREATE OR REPLACE FUNCTION sync_task_completed_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes, update completed accordingly
  IF NEW.status = 'completed' THEN
    NEW.completed = TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
  ELSE
    NEW.completed = FALSE;
    NEW.completed_at = NULL;
  END IF;
  
  -- When completed changes, update status accordingly
  IF NEW.completed = TRUE AND NEW.status != 'completed' THEN
    NEW.status = 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
  ELSIF NEW.completed = FALSE AND NEW.status = 'completed' THEN
    NEW.status = 'pending';
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync completed and status
DROP TRIGGER IF EXISTS sync_completed_status ON public.tasks;
CREATE TRIGGER sync_completed_status
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_completed_status();

-- Add constraint to ensure proper task type structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
      (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type = 'today' AND task_date IS NULL AND due_at IS NOT NULL) OR
      (type IS NULL) -- Allow NULL for backward compatibility
    );
  END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due_range ON public.tasks(goal_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON public.tasks(user_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_range ON public.tasks(user_id, due_at);

-- Create function to check core tables (for health checks)
CREATE OR REPLACE FUNCTION public.grind_check_core_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_ok BOOLEAN;
  required_columns BOOLEAN;
BEGIN
  -- Check if core tables exist
  tables_ok := (
    to_regclass('public.profiles') IS NOT NULL AND
    to_regclass('public.goals') IS NOT NULL AND
    to_regclass('public.tasks') IS NOT NULL
  );
  
  -- Check if required columns exist in tasks table
  required_columns := (
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'type'
    ) AND
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'task_date'
    ) AND
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'due_at'
    ) AND
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'load_score'
    ) AND
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'proof_mode'
    )
  );
  
  RETURN jsonb_build_object(
    'ok', tables_ok AND required_columns,
    'tables_exist', tables_ok,
    'required_columns_exist', required_columns
  );
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT * FROM public.grind_check_core_tables();

-- Show updated tasks table structure
SELECT 'UPDATED TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;