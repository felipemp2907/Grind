-- Fix Schema Cache and Level Column Issue
-- Run this script in your Supabase SQL Editor to fix the schema cache issue

-- 1. First, let's check if the profiles table exists and what columns it has
SELECT 'CURRENT PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Drop and recreate the profiles table to ensure it has all required columns
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Recreate profiles table with all required columns
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1 NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  streak_days INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Create or replace the ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile with all required columns
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    level = COALESCE(profiles.level, 1),
    xp = COALESCE(profiles.xp, 0),
    streak_days = COALESCE(profiles.streak_days, 0),
    longest_streak = COALESCE(profiles.longest_streak, 0),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    1,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Add updated_at trigger to profiles table
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. Create check_user_exists function
CREATE OR REPLACE FUNCTION public.check_user_exists(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Force refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 13. Wait a moment and refresh again to ensure it takes effect
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 14. Verify the table structure after recreation
SELECT 'UPDATED PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 15. Test the ensure_user_profile function
DO $$
DECLARE
    test_user_id UUID;
    test_result BOOLEAN;
BEGIN
    -- Get a test user ID from auth.users (if any exist)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the ensure_user_profile function
        SELECT public.ensure_user_profile(test_user_id, 'Test User') INTO test_result;
        
        IF test_result THEN
            RAISE NOTICE 'ensure_user_profile function working correctly!';
            
            -- Clean up test data
            DELETE FROM public.profiles WHERE id = test_user_id AND name = 'Test User';
        ELSE
            RAISE NOTICE 'ensure_user_profile function returned FALSE - user may not exist in auth.users';
        END IF;
    ELSE
        RAISE NOTICE 'No auth users found - function test skipped';
    END IF;
END $$;

-- 16. Final verification
SELECT 'SCHEMA CACHE REFRESH AND LEVEL COLUMN FIX COMPLETED!' as status;

-- 17. Show any existing profiles to verify structure
SELECT 'EXISTING PROFILES:' as info;
SELECT id, name, level, xp, streak_days, longest_streak, created_at 
FROM public.profiles 
LIMIT 5;