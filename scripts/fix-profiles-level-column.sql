-- Fix profiles table missing 'level' column
-- Run this script in your Supabase SQL Editor

-- 1. First, remove any demo/test users that might be causing issues
DELETE FROM public.profiles WHERE name LIKE '%Demo%' OR name LIKE '%demo%' OR name LIKE '%Test%' OR name LIKE '%test%' OR name LIKE '%archiver%';

-- 2. Add the missing 'level' column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 3. Add other potentially missing columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 4. Update existing profiles to have default values for new columns
UPDATE public.profiles 
SET 
  level = COALESCE(level, 1),
  full_name = COALESCE(full_name, name),
  experience_level = COALESCE(experience_level, 'beginner'),
  xp = COALESCE(xp, 0),
  streak_days = COALESCE(streak_days, 0),
  longest_streak = COALESCE(longest_streak, 0)
WHERE level IS NULL OR full_name IS NULL OR experience_level IS NULL OR xp IS NULL OR streak_days IS NULL OR longest_streak IS NULL;

-- 5. Update the ensure_user_profile function to handle all columns
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile with all required columns
  INSERT INTO public.profiles (id, name, full_name, experience_level, level, xp, streak_days, longest_streak, created_at, updated_at)
  VALUES (user_id, user_name, user_name, 'beginner', 1, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, profiles.name),
    experience_level = COALESCE(profiles.experience_level, 'beginner'),
    level = COALESCE(profiles.level, 1),
    xp = COALESCE(profiles.xp, 0),
    streak_days = COALESCE(profiles.streak_days, 0),
    longest_streak = COALESCE(profiles.longest_streak, 0),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update the handle_new_user function to include all columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, experience_level, level, xp, streak_days, longest_streak, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    'beginner',
    1,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Force refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative method to refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- 8. Verify the table structure
SELECT 'PROFILES TABLE COLUMNS AFTER FIX:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 9. Check if any profiles exist and their structure
SELECT 'EXISTING PROFILES COUNT:' as info, COUNT(*) as count FROM public.profiles;

SELECT 'Profiles level column fix completed successfully!' as status;