-- ========================================
-- COMPREHENSIVE DATABASE SCHEMA FIX
-- ========================================
-- 
-- PROBLEM: Missing columns in tasks table causing insertion failures
-- SOLUTION: Add all required columns and fix constraints
--
-- Run this in your Supabase SQL Editor
--

BEGIN;

-- 1. Add all missing columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('streak', 'today'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_for_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 10;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Ensure goals table has required columns
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT 100;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 3. Ensure profiles table has required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 4. Drop existing constraint if it exists and recreate it
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tasks_type_shape' 
        AND conrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_shape;
    END IF;
    
    -- Add the constraint
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
        (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
        (type = 'today' AND task_date IS NULL AND due_at IS NOT NULL) OR
        (type IS NULL)
    );
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_for_date);

-- 6. Update RLS policies to ensure they work properly
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Drop and recreate RLS policies for goals table
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Drop and recreate RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, level, xp, streak_days, longest_streak, experience_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
        1,
        0,
        0,
        0,
        'beginner'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();

COMMIT;

-- Verify the fix
SELECT 'Database schema fix completed successfully' AS status;

-- Show all columns in tasks table to verify
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks' 
ORDER BY ordinal_position;