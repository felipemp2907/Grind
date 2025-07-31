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
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active';

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

-- 9. Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration applied successfully!' as status;