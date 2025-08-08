-- Fix profiles table schema and remove demo user
-- Run this script in your Supabase SQL Editor

-- 1. First, remove any demo users that might be causing issues
DELETE FROM public.profiles WHERE name LIKE '%Demo%' OR name LIKE '%demo%' OR name LIKE '%Test%' OR name LIKE '%test%';

-- 2. Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

-- 3. Update existing profiles to have default values for new columns
UPDATE public.profiles 
SET 
  full_name = COALESCE(full_name, name),
  experience_level = COALESCE(experience_level, 'beginner')
WHERE full_name IS NULL OR experience_level IS NULL;

-- 4. Update the ensure_user_profile function to handle the new columns
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile with all required columns
  INSERT INTO public.profiles (id, name, full_name, experience_level, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, user_name, 'beginner', 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, profiles.name),
    experience_level = COALESCE(profiles.experience_level, 'beginner'),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the handle_new_user function to include new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, name, full_name, experience_level, level, xp, streak_days, longest_streak)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    'beginner',
    1,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Refresh schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- 7. Verify the table structure
SELECT 'PROFILES TABLE COLUMNS AFTER FIX:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 8. Test the ensure_user_profile function
DO $
DECLARE
    test_user_id UUID;
    test_result BOOLEAN;
BEGIN
    -- Get a test user ID from auth.users (if any exist)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT public.ensure_user_profile(test_user_id, 'Test User') INTO test_result;
        
        IF test_result THEN
            RAISE NOTICE 'ensure_user_profile function working correctly!';
            -- Clean up test data
            DELETE FROM public.profiles WHERE name = 'Test User' AND id = test_user_id;
        ELSE
            RAISE NOTICE 'ensure_user_profile function returned FALSE - user may not exist in auth.users';
        END IF;
    ELSE
        RAISE NOTICE 'No auth users found - function test skipped';
    END IF;
END $;

SELECT 'Profiles schema fix completed successfully!' as status;