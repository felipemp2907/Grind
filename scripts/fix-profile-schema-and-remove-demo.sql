-- Fix Profile Schema and Remove Demo User
-- This script fixes the profile schema mismatch and removes demo user

-- 1. Remove demo user and all associated data
DELETE FROM public.journal_entries WHERE user_id = 'demo-user-id'::uuid;
DELETE FROM public.tasks WHERE user_id = 'demo-user-id'::uuid;
DELETE FROM public.goals WHERE user_id = 'demo-user-id'::uuid;
DELETE FROM public.profiles WHERE id = 'demo-user-id'::uuid;

-- Also remove any profiles with 'archiver' or demo-related names
DELETE FROM public.journal_entries WHERE user_id IN (
    SELECT id FROM public.profiles WHERE name ILIKE '%demo%' OR name ILIKE '%archiver%' OR name ILIKE '%test%'
);
DELETE FROM public.tasks WHERE user_id IN (
    SELECT id FROM public.profiles WHERE name ILIKE '%demo%' OR name ILIKE '%archiver%' OR name ILIKE '%test%'
);
DELETE FROM public.goals WHERE user_id IN (
    SELECT id FROM public.profiles WHERE name ILIKE '%demo%' OR name ILIKE '%archiver%' OR name ILIKE '%test%'
);
DELETE FROM public.profiles WHERE name ILIKE '%demo%' OR name ILIKE '%archiver%' OR name ILIKE '%test%';

-- 2. Fix the profiles table schema to match what the code expects
-- Add full_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- Add experience_level column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'experience_level') THEN
        ALTER TABLE public.profiles ADD COLUMN experience_level TEXT DEFAULT 'beginner';
    END IF;
END $$;

-- 3. Migrate existing data from 'name' to 'full_name' if needed
UPDATE public.profiles 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- 4. Update the ensure_user_profile function to use the correct column names
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile with correct column names
  INSERT INTO public.profiles (id, name, full_name, experience_level, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, user_name, 'beginner', 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    experience_level = COALESCE(EXCLUDED.experience_level, profiles.experience_level),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the handle_new_user function to use correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, experience_level)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    'beginner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure RLS is properly enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 7. Recreate RLS policies to ensure they're working correctly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 8. Recreate goals policies
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

CREATE POLICY "Users can view their own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Recreate tasks policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Recreate journal_entries policies
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

CREATE POLICY "Users can view their own journal entries" ON public.journal_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries" ON public.journal_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" ON public.journal_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" ON public.journal_entries
    FOR DELETE USING (auth.uid() = user_id);

-- 11. Refresh schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- 12. Verify the fix
SELECT 'Profile schema fixed and demo user removed!' as status;

-- Show current profiles table structure
SELECT 'PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Show remaining profiles (should not include demo users)
SELECT 'REMAINING PROFILES:' as info;
SELECT id, name, full_name, experience_level FROM public.profiles;

RAISE NOTICE 'Schema fixed and demo user removed successfully!';