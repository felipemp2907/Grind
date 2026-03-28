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

-- 6. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Test the function with existing users
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
            RAISE NOTICE 'ensure_user_profile function test: SUCCESS';
        ELSE
            RAISE NOTICE 'ensure_user_profile function test: FAILED';
        END IF;
        
        -- Clean up test data if it was created
        DELETE FROM public.profiles WHERE name = 'Test User' AND id = test_user_id;
    ELSE
        RAISE NOTICE 'No auth users found - function test skipped';
    END IF;
END $$;

-- 8. Verify function exists
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'ensure_user_profile';

SELECT 'ensure_user_profile function fix completed!' as status;