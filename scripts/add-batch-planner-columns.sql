-- Add columns needed for batch planner
-- This script is idempotent - safe to run multiple times

-- Add full_name column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- Add batch planner columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('streak', 'today'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_date date;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS due_at timestamptz;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS load_score integer DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS proof_mode text DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));

-- Add constraint to ensure proper task shape
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tasks_type_shape'
  ) THEN
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_type_shape CHECK (
      (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
      (type = 'today' AND task_date IS NULL AND due_at IS NOT NULL) OR
      (type IS NULL)  -- Allow existing tasks without type
    );
  END IF;
END$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date 
ON public.tasks(goal_id, type, task_date);

CREATE INDEX IF NOT EXISTS idx_tasks_goal_due_range 
ON public.tasks(goal_id, due_at);

-- Add completed boolean column for UI compatibility
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed boolean 
GENERATED ALWAYS AS (status = 'completed') STORED;

-- Update existing tasks to have a default type if needed
UPDATE public.tasks 
SET type = 'today' 
WHERE type IS NULL AND is_habit = false;

UPDATE public.tasks 
SET type = 'streak' 
WHERE type IS NULL AND is_habit = true;

-- Set task_date for existing streak tasks
UPDATE public.tasks 
SET task_date = created_at::date 
WHERE type = 'streak' AND task_date IS NULL;

-- Set due_at for existing today tasks (set to 9 AM on created date)
UPDATE public.tasks 
SET due_at = (created_at::date + interval '9 hours')::timestamptz
WHERE type = 'today' AND due_at IS NULL;

-- Set default load_score for existing tasks
UPDATE public.tasks 
SET load_score = CASE 
  WHEN xp_value >= 50 THEN 3
  WHEN xp_value >= 30 THEN 2
  ELSE 1
END
WHERE load_score IS NULL;

-- Set default proof_mode for existing tasks
UPDATE public.tasks 
SET proof_mode = 'flex'
WHERE proof_mode IS NULL;

COMMIT;