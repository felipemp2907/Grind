-- ========================================
-- FIX TASK CONSTRAINTS TO BE MORE FLEXIBLE
-- ========================================
-- 
-- This script updates the tasks table constraints to be more flexible
-- while still maintaining data integrity
--

BEGIN;

-- 1. Drop the overly strict type_shape constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_type_shape' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_shape;
        RAISE NOTICE 'Dropped tasks_type_shape constraint';
    END IF;
END $$;

-- 2. Drop the type_check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_type_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_check;
        RAISE NOTICE 'Dropped tasks_type_check constraint';
    END IF;
END $$;

-- 3. Add a simpler type constraint that just validates the type values
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_type_check 
CHECK (type IS NULL OR type IN ('streak', 'today'));

-- 4. Ensure all date columns exist and can be NULL
ALTER TABLE public.tasks ALTER COLUMN task_date DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN due_at DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN scheduled_for_date DROP NOT NULL;

-- 5. Add a more flexible constraint that allows various date combinations
-- This constraint ensures at least one date field is set when type is specified
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_date_consistency 
CHECK (
    -- If type is specified, at least one date field must be set
    (type IS NULL) OR 
    (task_date IS NOT NULL OR due_at IS NOT NULL OR due_date IS NOT NULL OR scheduled_for_date IS NOT NULL)
);

-- 6. Update any existing tasks that might violate the new constraints
-- Set scheduled_for_date for any tasks that don't have any date
UPDATE public.tasks 
SET scheduled_for_date = CURRENT_DATE
WHERE type IS NOT NULL 
  AND task_date IS NULL 
  AND due_at IS NULL 
  AND due_date IS NULL 
  AND scheduled_for_date IS NULL;

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_type_dates ON public.tasks(type, task_date, due_at, scheduled_for_date);

COMMIT;

-- Verify the changes
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Show column information
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tasks'
  AND column_name IN ('type', 'task_date', 'due_at', 'due_date', 'scheduled_for_date')
ORDER BY ordinal_position;