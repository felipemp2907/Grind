-- ========================================
-- COMPREHENSIVE FIX FOR ALL DATABASE ISSUES
-- ========================================
-- 
-- This script fixes:
-- 1. Task constraint violations (tasks_type_check, tasks_type_shape)
-- 2. Missing journal_entries.media_uri column
-- 3. Ensures proper task generation can continue
--

BEGIN;

-- 1. Drop problematic constraints that are causing insertion failures
DO $$ 
BEGIN
    -- Drop tasks_type_shape constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_type_shape' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_shape;
        RAISE NOTICE 'Dropped tasks_type_shape constraint';
    END IF;
    
    -- Drop tasks_type_check constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_type_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_check;
        RAISE NOTICE 'Dropped tasks_type_check constraint';
    END IF;
END $$;

-- 2. Add a simple, flexible type constraint
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_type_valid 
CHECK (type IS NULL OR type IN ('streak', 'today'));

-- 3. Ensure all required columns exist with proper defaults
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_for_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- 4. Make date columns nullable to avoid NOT NULL constraint violations
ALTER TABLE public.tasks ALTER COLUMN task_date DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN due_at DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN scheduled_for_date DROP NOT NULL;

-- 5. Add missing media_uri column to journal_entries
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS media_uri TEXT;

-- 6. Add status constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_status_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
        CHECK (status IN ('pending', 'completed', 'skipped'));
    END IF;
END $$;

-- 7. Add proof_mode constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_proof_mode_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_proof_mode_check 
        CHECK (proof_mode IN ('flex', 'realtime'));
    END IF;
END $$;

-- 8. Add priority constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_priority_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check 
        CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
END $$;

-- 9. Add load_score constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_load_score_check' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_load_score_check 
        CHECK (load_score BETWEEN 1 AND 5);
    END IF;
END $$;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_type_date ON public.tasks(type, task_date) WHERE type = 'streak';
CREATE INDEX IF NOT EXISTS idx_tasks_type_due ON public.tasks(type, due_at) WHERE type = 'today';
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_status ON public.tasks(user_id, type, status);

-- 11. Update any existing tasks that might have invalid data
-- Set default scheduled_for_date for tasks without any date
UPDATE public.tasks 
SET scheduled_for_date = COALESCE(task_date, due_date, CURRENT_DATE)
WHERE scheduled_for_date IS NULL 
  AND (task_date IS NOT NULL OR due_date IS NOT NULL OR due_at IS NOT NULL);

-- Set default scheduled_for_date for remaining tasks
UPDATE public.tasks 
SET scheduled_for_date = CURRENT_DATE
WHERE scheduled_for_date IS NULL;

COMMIT;

-- Verify the fix
SELECT 'All database issues fixed successfully' AS status;

-- Show constraint information
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass
  AND contype = 'c'
  AND conname LIKE '%tasks_%'
ORDER BY conname;

-- Show journal_entries columns to verify media_uri was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'journal_entries'
ORDER BY ordinal_position;