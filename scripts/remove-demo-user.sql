-- Remove Demo User and Restore Authentication
-- This script removes the demo user and ensures proper authentication is required

-- Remove demo user profile
DELETE FROM profiles WHERE id = 'demo-user-id'::uuid;

-- Remove any demo user data from other tables
DELETE FROM goals WHERE user_id = 'demo-user-id'::uuid;
DELETE FROM tasks WHERE user_id = 'demo-user-id'::uuid;
DELETE FROM journal_entries WHERE user_id = 'demo-user-id'::uuid;

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Verify RLS policies are in place for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Verify RLS policies are in place for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Verify RLS policies are in place for tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Verify RLS policies are in place for journal_entries
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

CREATE POLICY "Users can view their own journal entries" ON journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries" ON journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" ON journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" ON journal_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Verify that the ensure_user_profile function exists and works correctly
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_name text DEFAULT 'User')
RETURNS void AS $$
BEGIN
    INSERT INTO profiles (id, full_name, experience_level, created_at, updated_at)
    VALUES (user_id, user_name, 'beginner', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger function for new user profiles exists
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO profiles (id, full_name, experience_level)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 'beginner');
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, do nothing
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify demo user is removed
SELECT COUNT(*) as demo_users_remaining FROM profiles WHERE id = 'demo-user-id'::uuid;

RAISE NOTICE 'Demo user removed and authentication restored successfully!';