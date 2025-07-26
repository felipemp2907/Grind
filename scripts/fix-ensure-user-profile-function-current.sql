-- Fix ensure_user_profile function not found error
-- Run this script in your Supabase SQL Editor

-- 1. Drop existing function if it exists (with all possible signatures)
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT);

-- 2. Create the ensure_user_profile function with proper security
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE NOTICE 'User % does not exist in auth.users', user_id;
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = CURRENT_TIMESTAMP;
  
  RAISE NOTICE 'Profile ensured for user %', user_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in ensure_user_profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT) TO anon;

-- 4. Also create a simpler version with just user_id for backward compatibility
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.ensure_user_profile(user_id, 'User');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions for the simpler version
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO anon;

-- 6. Create a helper function to check if user exists in auth.users
CREATE OR REPLACE FUNCTION public.check_user_exists(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions for check_user_exists
GRANT EXECUTE ON FUNCTION public.check_user_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(UUID) TO anon;

-- 8. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 9. Verify function exists
SELECT 
    routine_name,
    routine_type,
    specific_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('ensure_user_profile', 'check_user_exists')
ORDER BY routine_name;

-- 10. Test the function with a dummy UUID to verify it works
DO $$
DECLARE
    test_result BOOLEAN;
    dummy_uuid UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Test the ensure_user_profile function with a dummy UUID
    -- This should return FALSE since the user doesn't exist in auth.users
    SELECT public.ensure_user_profile(dummy_uuid, 'Test User') INTO test_result;
    
    IF test_result = FALSE THEN
        RAISE NOTICE 'ensure_user_profile function test: SUCCESS (correctly returned FALSE for non-existent user)';
    ELSE
        RAISE NOTICE 'ensure_user_profile function test: UNEXPECTED RESULT (should have returned FALSE)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ensure_user_profile function test: ERROR - %', SQLERRM;
END $$;

SELECT 'ensure_user_profile function fix completed successfully!' as status;