-- Apply the streak preseed migration
-- This script adds the necessary columns to support the new task system

-- 1. Add task_date column for streak tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS task_date DATE;

-- 2. Add type column to distinguish between today and streak tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('today', 'streak')) DEFAULT 'today';

-- 3. Add status column to goals table
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active';

-- 4. Drop existing constraint if it exists
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS chk_task_date_by_type;

-- 5. Add constraint to ensure proper task_date usage
ALTER TABLE public.tasks
ADD CONSTRAINT chk_task_date_by_type
CHECK (
    (type = 'today'  AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON public.tasks(user_id, type, task_date);

-- 7. Update existing tasks to have proper type
UPDATE public.tasks
SET type = CASE
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL;

-- 8. Update existing goals to have active status
UPDATE public.goals
SET status = 'active'
WHERE status IS NULL;

-- 9. Create RPC function to get active goals for a specific date
CREATE OR REPLACE FUNCTION public.get_active_goals_for_date(target_date DATE)
RETURNS SETOF public.goals AS $
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.goals
  WHERE user_id = auth.uid()
    AND deadline >= target_date
    AND status = 'active';
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_goals_for_date(DATE) TO authenticated;

-- 11. Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration applied successfully!' as status;