-- Comprehensive Database Fix Script
-- This script fixes all database schema issues and ensures proper setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with all required columns
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'User',
    email TEXT,
    avatar_url TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    experience_level TEXT DEFAULT 'beginner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table with all required columns
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'active',
    progress_value INTEGER DEFAULT 0,
    target_value INTEGER DEFAULT 100,
    unit TEXT,
    xp_earned INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    color TEXT,
    cover_image TEXT,
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table with all required columns
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'today', -- 'today', 'streak', 'milestone'
    task_date DATE, -- For streak tasks, the specific date
    due_date TIMESTAMP WITH TIME ZONE, -- For today tasks, the due date/time
    is_habit BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    xp_value INTEGER DEFAULT 10,
    priority TEXT DEFAULT 'medium',
    proof_type TEXT DEFAULT 'none', -- 'none', 'photo', 'text', 'timer'
    proof_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_deadline ON goals(deadline);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_task_date ON tasks(task_date);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(completed);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace the ensure_user_profile function
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        -- For demo user, allow creation even if not in auth.users
        IF user_id::text = 'demo-user-id' THEN
            -- Continue with profile creation
            NULL;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Insert or update the profile
    INSERT INTO profiles (id, name, level, xp, streak_days, longest_streak, experience_level)
    VALUES (user_id, user_name, 1, 0, 0, 0, 'beginner')
    ON CONFLICT (id) 
    DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in ensure_user_profile: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create trigger function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, name, email, level, xp, streak_days, longest_streak, experience_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
        NEW.email,
        1,
        0,
        0,
        0,
        'beginner'
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create demo user profile for development
INSERT INTO profiles (id, name, level, xp, streak_days, longest_streak, experience_level)
VALUES ('demo-user-id', 'Demo User', 1, 0, 0, 0, 'beginner')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON goals TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile TO anon, authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Test the setup
DO $$
BEGIN
    -- Test profile creation
    PERFORM ensure_user_profile('demo-user-id', 'Demo User');
    
    -- Verify tables exist and are accessible
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'demo-user-id') THEN
        RAISE EXCEPTION 'Demo user profile was not created successfully';
    END IF;
    
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Tables created: profiles, goals, tasks';
    RAISE NOTICE 'RLS policies enabled and configured';
    RAISE NOTICE 'Demo user profile created';
    RAISE NOTICE 'Functions and triggers configured';
END;
$$;