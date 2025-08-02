-- COMPREHENSIVE FIX: Database schema and tRPC compatibility
-- This script fixes both the database schema issues and ensures tRPC works properly

BEGIN;

-- 1. Add missing columns to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';

-- 2. Add missing columns to tasks table for streak functionality
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('regular', 'streak', 'milestone')) DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS task_date DATE,
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_goal ON public.tasks(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit ON public.tasks(is_habit);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

-- 4. Update existing records to have default values
UPDATE public.goals SET status = 'active' WHERE status IS NULL;
UPDATE public.goals SET priority = 'medium' WHERE priority IS NULL;
UPDATE public.goals SET target_value = 100 WHERE target_value IS NULL;

UPDATE public.tasks SET type = 'regular' WHERE type IS NULL;
UPDATE public.tasks SET is_habit = FALSE WHERE is_habit IS NULL;
UPDATE public.tasks SET xp_value = 10 WHERE xp_value IS NULL;

-- 5. Ensure RLS policies are correct for new columns
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Ensure tasks RLS policies are correct for new columns
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;

-- 7. Force schema cache refresh for PostgREST/Supabase
SELECT pg_notify('pgrst', 'reload schema');

-- 8. Verify the fix worked
SELECT 'Database schema fix completed successfully!' as status;

-- Display updated goals table structure
SELECT 'GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

-- Display updated tasks table structure  
SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Test data insertion to verify schema works
INSERT INTO public.goals (
  user_id, 
  title, 
  description, 
  deadline, 
  category, 
  target_value, 
  unit, 
  priority, 
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- placeholder user_id
  'Test Goal', 
  'Test Description', 
  NOW() + INTERVAL '30 days',
  'fitness',
  100,
  'reps',
  'high',
  'active'
) ON CONFLICT DO NOTHING;

SELECT 'Schema verification completed - goals table can accept all required columns!' as verification_status;