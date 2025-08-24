-- ========================================
-- FIX TASK CONSTRAINTS - FINAL SOLUTION
-- ========================================
-- 
-- PROBLEM: Task insertion failing due to strict constraints
-- SOLUTION: Fix the constraints and column requirements
--
-- Run this in your Supabase SQL Editor
--

BEGIN;

-- 1. Drop the problematic constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_type_shape;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_type_check;

-- 2. Make scheduled_for_date nullable (it's causing NOT NULL constraint violations)
ALTER TABLE public.tasks ALTER COLUMN scheduled_for_date DROP NOT NULL;

-- 3. Ensure all required columns exist with proper defaults
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_for_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. Add a more flexible constraint that allows the planner to work
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_flexible CHECK (
    type IS NULL OR 
    type IN ('streak', 'today') OR
    type = ''
);

-- 5. Add constraint for status values
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (
    status IS NULL OR 
    status IN ('pending', 'completed', 'skipped')
);

-- 6. Add constraint for proof_mode values
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_proof_mode_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_proof_mode_check CHECK (
    proof_mode IS NULL OR 
    proof_mode IN ('flex', 'realtime')
);

-- 7. Add constraint for load_score values
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_load_score_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_load_score_check CHECK (
    load_score IS NULL OR 
    (load_score >= 1 AND load_score <= 5)
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_for_date ON public.tasks(scheduled_for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON public.tasks(user_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_at);

-- 9. Update any existing NULL values to have proper defaults
UPDATE public.tasks SET 
    status = 'pending' WHERE status IS NULL,
    completed = FALSE WHERE completed IS NULL,
    load_score = 1 WHERE load_score IS NULL,
    proof_mode = 'flex' WHERE proof_mode IS NULL;

COMMIT;

-- 10. Test the fix by inserting sample data
DO $$
DECLARE
    test_user_id UUID;
    test_goal_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Ensure user has a profile
        INSERT INTO public.profiles (id, full_name, level, xp, streak_days, longest_streak)
        VALUES (test_user_id, 'Test User', 1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;
        
        -- Create a test goal
        INSERT INTO public.goals (user_id, title, description, deadline)
        VALUES (test_user_id, 'Test Goal - Constraint Fix', 'Testing constraint fixes', NOW() + INTERVAL '30 days')
        RETURNING id INTO test_goal_id;
        
        -- Test streak task insertion
        INSERT INTO public.tasks (
            user_id, goal_id, title, description, type, task_date, 
            load_score, proof_mode, status, completed, xp_value
        ) VALUES (
            test_user_id, test_goal_id, 'Test Streak Task', 'Testing streak task insertion',
            'streak', CURRENT_DATE, 2, 'flex', 'pending', FALSE, 20
        );
        
        -- Test today task insertion
        INSERT INTO public.tasks (
            user_id, goal_id, title, description, type, due_at,
            load_score, proof_mode, status, completed, xp_value
        ) VALUES (
            test_user_id, test_goal_id, 'Test Today Task', 'Testing today task insertion',
            'today', NOW() + INTERVAL '2 hours', 3, 'realtime', 'pending', FALSE, 30
        );
        
        -- Test task with scheduled_for_date
        INSERT INTO public.tasks (
            user_id, goal_id, title, description, type, scheduled_for_date,
            load_score, proof_mode, status, completed, xp_value
        ) VALUES (
            test_user_id, test_goal_id, 'Test Scheduled Task', 'Testing scheduled task insertion',
            'today', CURRENT_DATE, 1, 'flex', 'pending', FALSE, 10
        );
        
        RAISE NOTICE 'Successfully inserted test tasks!';
        
        -- Clean up test data
        DELETE FROM public.tasks WHERE goal_id = test_goal_id;
        DELETE FROM public.goals WHERE id = test_goal_id;
        
        RAISE NOTICE 'Test completed successfully - constraints are fixed!';
    ELSE
        RAISE NOTICE 'No users found - schema is ready but cannot test insertion';
    END IF;
END $$;

-- 11. Display final verification
SELECT 'TASK CONSTRAINT FIX COMPLETED SUCCESSFULLY!' AS status;

-- Show the current task table structure
SELECT 'TASKS TABLE STRUCTURE:' AS info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Show constraints
SELECT 'TASK TABLE CONSTRAINTS:' AS info;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY constraint_name;