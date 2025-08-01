-- Apply the streak preseed migration
-- This ensures the task_date column exists and constraints are properly set

-- 1-a: Add new column for dated streak copies
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS task_date DATE;

-- 1-b: Add type column to distinguish between today and streak tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('today', 'streak')) DEFAULT 'today';

-- 1-c: Drop existing constraint if it exists
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS chk_task_date_by_type;

-- 1-d: Add constraint to ensure exactly one of (type, task_date) rules is respected
ALTER TABLE public.tasks
ADD CONSTRAINT chk_task_date_by_type
CHECK (
    (type = 'today' AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);

-- 1-e: Add index for fast calendar look-ups
CREATE INDEX IF NOT EXISTS idx_tasks_date
ON public.tasks(task_date);

-- 1-f: Add index for fast type filtering
CREATE INDEX IF NOT EXISTS idx_tasks_type
ON public.tasks(type);

-- 1-g: Add composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date
ON public.tasks(user_id, type, task_date);

-- 2: Add status column to goals table if it doesn't exist
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active';

-- 3: Update existing tasks to have proper type
UPDATE public.tasks
SET type = CASE
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL;

-- 4: Update existing goals to have active status
UPDATE public.goals
SET status = 'active'
WHERE status IS NULL;

SELECT 'Migration applied successfully!' as status;