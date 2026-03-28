-- Comprehensive Database Migration for Streak Preseed System
-- This script applies all necessary changes to support the streak preseed functionality
-- Run this script in your Supabase SQL Editor

-- 1. Add task_date column if it doesn't exist
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS task_date DATE;

-- 2. Add type column if it doesn't exist
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('today', 'streak')) DEFAULT 'today';

-- 3. Add status column to goals if it doesn't exist
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';

-- 4. Drop existing constraint if it exists
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS chk_task_date_by_type;

-- 5. Add constraint to ensure proper task_date usage
ALTER TABLE public.tasks
ADD CONSTRAINT chk_task_date_by_type
CHECK (
    (type = 'today' AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON public.tasks(user_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

-- 7. Update existing tasks to have proper type based on is_habit
UPDATE public.tasks
SET type = CASE
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL OR type = 'today';

-- 8. Update existing goals to have active status
UPDATE public.goals
SET status = 'active'
WHERE status IS NULL;

-- 9. Create helper view for active goals
CREATE OR REPLACE VIEW public.active_goals_for AS
SELECT *
FROM public.goals
WHERE user_id = auth.uid()
  AND deadline >= CURRENT_DATE
  AND status = 'active';

-- 10. Create RPC function to get active goals for a specific date
CREATE OR REPLACE FUNCTION public.get_active_goals_for_date(target_date DATE)
RETURNS SETOF public.goals AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.goals
  WHERE user_id = auth.uid()
    AND deadline >= target_date
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT SELECT ON public.active_goals_for TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_goals_for_date(DATE) TO authenticated;

-- 12. Add comments for documentation
COMMENT ON COLUMN public.tasks.task_date IS 'Date for streak tasks (YYYY-MM-DD). NULL for today tasks, required for streak tasks.';
COMMENT ON COLUMN public.tasks.type IS 'Task type: today (one-time tasks) or streak (recurring daily habits)';
COMMENT ON COLUMN public.goals.status IS 'Goal status: active, completed, or abandoned';
COMMENT ON CONSTRAINT chk_task_date_by_type ON public.tasks IS 'Ensures today tasks have NULL task_date and streak tasks have non-NULL task_date.';
COMMENT ON VIEW public.active_goals_for IS 'View of active goals that have not passed their deadline for the current user.';

-- 13. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 14. Verify the migration
SELECT 'Migration completed successfully!' as status;

-- Show table structure to verify changes
SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

-- Show constraints
SELECT 'TASK CONSTRAINTS:' as info;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND table_name = 'tasks';

-- Show indexes
SELECT 'TASK INDEXES:' as info;
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tasks' AND schemaname = 'public';