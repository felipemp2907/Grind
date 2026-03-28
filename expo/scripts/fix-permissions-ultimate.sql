-- ========================================
-- ULTIMATE PERMISSIONS FIX
-- ========================================
-- 
-- This script fixes all permission issues by:
-- 1. Ensuring all required tables exist with proper columns
-- 2. Dropping and recreating all RLS policies
-- 3. Granting proper permissions to authenticated users
-- 4. Creating necessary functions and triggers
--
-- Run this in your Supabase SQL Editor
--

BEGIN;

-- ========================================
-- 1. CREATE TABLES IF THEY DON'T EXIST
-- ========================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    name TEXT,
    avatar_url TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    experience_level TEXT DEFAULT 'beginner',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    category TEXT,
    target_value INTEGER DEFAULT 100,
    unit TEXT DEFAULT '',
    color TEXT,
    cover_image TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table with all required columns
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    type TEXT CHECK (type IN ('streak', 'today')),
    task_date DATE,
    due_at TIMESTAMPTZ,
    load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5),
    proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime')),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    scheduled_for_date DATE,
    xp_value INTEGER DEFAULT 10,
    is_habit BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ========================================

-- Add missing columns to profiles table
DO $$ 
BEGIN
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Add name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
    END IF;
    
    -- Add experience_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'experience_level') THEN
        ALTER TABLE public.profiles ADD COLUMN experience_level TEXT DEFAULT 'beginner';
    END IF;
    
    -- Add level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level') THEN
        ALTER TABLE public.profiles ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
    
    -- Add xp if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp') THEN
        ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0;
    END IF;
    
    -- Add streak_days if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak_days') THEN
        ALTER TABLE public.profiles ADD COLUMN streak_days INTEGER DEFAULT 0;
    END IF;
    
    -- Add longest_streak if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longest_streak') THEN
        ALTER TABLE public.profiles ADD COLUMN longest_streak INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add missing columns to goals table
DO $$ 
BEGIN
    -- Add status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') THEN
        ALTER TABLE public.goals ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    -- Add category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'category') THEN
        ALTER TABLE public.goals ADD COLUMN category TEXT;
    END IF;
    
    -- Add target_value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'target_value') THEN
        ALTER TABLE public.goals ADD COLUMN target_value INTEGER DEFAULT 100;
    END IF;
    
    -- Add unit if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'unit') THEN
        ALTER TABLE public.goals ADD COLUMN unit TEXT DEFAULT '';
    END IF;
    
    -- Add color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'color') THEN
        ALTER TABLE public.goals ADD COLUMN color TEXT;
    END IF;
    
    -- Add cover_image if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'cover_image') THEN
        ALTER TABLE public.goals ADD COLUMN cover_image TEXT;
    END IF;
    
    -- Add priority if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'priority') THEN
        ALTER TABLE public.goals ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;
END $$;

-- Add missing columns to tasks table
DO $$ 
BEGIN
    -- Add status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
        ALTER TABLE public.tasks ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE public.tasks ADD COLUMN type TEXT;
    END IF;
    
    -- Add task_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_date') THEN
        ALTER TABLE public.tasks ADD COLUMN task_date DATE;
    END IF;
    
    -- Add due_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_at') THEN
        ALTER TABLE public.tasks ADD COLUMN due_at TIMESTAMPTZ;
    END IF;
    
    -- Add load_score if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'load_score') THEN
        ALTER TABLE public.tasks ADD COLUMN load_score INTEGER DEFAULT 1;
    END IF;
    
    -- Add proof_mode if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'proof_mode') THEN
        ALTER TABLE public.tasks ADD COLUMN proof_mode TEXT DEFAULT 'flex';
    END IF;
    
    -- Add completed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed') THEN
        ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    -- Add scheduled_for_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_for_date') THEN
        ALTER TABLE public.tasks ADD COLUMN scheduled_for_date DATE;
    END IF;
    
    -- Add xp_value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'xp_value') THEN
        ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 10;
    END IF;
    
    -- Add is_habit if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_habit') THEN
        ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add priority if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE public.tasks ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;
END $$;

-- ========================================
-- 3. DROP ALL EXISTING CONSTRAINTS AND RECREATE THEM
-- ========================================

-- Drop existing constraints if they exist
DO $$ 
BEGIN
    -- Drop tasks constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_check') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_load_score_check') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_load_score_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_proof_mode_check') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_proof_mode_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_priority_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_shape') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_shape;
    END IF;
    
    -- Drop goals constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_status_check') THEN
        ALTER TABLE public.goals DROP CONSTRAINT goals_status_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_priority_check') THEN
        ALTER TABLE public.goals DROP CONSTRAINT goals_priority_check;
    END IF;
END $$;

-- Add constraints back
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'completed', 'skipped'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check CHECK (type IN ('streak', 'today'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_load_score_check CHECK (load_score BETWEEN 1 AND 5);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_proof_mode_check CHECK (proof_mode IN ('flex', 'realtime'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
    (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
    (type = 'today' AND task_date IS NULL AND due_at IS NOT NULL) OR
    (type IS NULL)
);

ALTER TABLE public.goals ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));
ALTER TABLE public.goals ADD CONSTRAINT goals_priority_check CHECK (priority IN ('low', 'medium', 'high'));

-- ========================================
-- 4. ENABLE RLS ON ALL TABLES
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. DROP ALL EXISTING RLS POLICIES
-- ========================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;

-- Drop goals policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Enable read access for own goals" ON public.goals;
DROP POLICY IF EXISTS "Enable insert for own goals" ON public.goals;
DROP POLICY IF EXISTS "Enable update for own goals" ON public.goals;
DROP POLICY IF EXISTS "Enable delete for own goals" ON public.goals;

-- Drop tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable read access for own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for own tasks" ON public.tasks;

-- Drop journal_entries policies
DROP POLICY IF EXISTS "Users can view own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON public.journal_entries;

-- ========================================
-- 6. CREATE NEW RLS POLICIES
-- ========================================

-- Profiles policies
CREATE POLICY "Enable read access for own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable delete for own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Goals policies
CREATE POLICY "Enable read access for own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Enable read access for own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Journal entries policies
CREATE POLICY "Enable read access for own journal entries" ON public.journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own journal entries" ON public.journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own journal entries" ON public.journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for own journal entries" ON public.journal_entries
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 7. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.goals TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.journal_entries TO authenticated;

-- Grant permissions on sequences (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- 8. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, name, level, xp, streak_days, longest_streak, experience_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        1,
        0,
        0,
        0,
        'beginner'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user exists
CREATE OR REPLACE FUNCTION public.check_user_exists(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. CREATE TRIGGERS
-- ========================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();

-- Create triggers to update timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type_date ON public.tasks(goal_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_due ON public.tasks(goal_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_for_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at);

COMMIT;

-- ========================================
-- 11. VERIFY THE FIX
-- ========================================

-- Show all tables and their columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'goals', 'tasks', 'journal_entries')
ORDER BY table_name, ordinal_position;

-- Show all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Ultimate permissions fix completed successfully!' AS status;