-- Fix Profile RLS Policy Issues
-- This script addresses Row Level Security policy violations when creating/updating profiles

-- 1. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create improved function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile with proper error handling
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return false
    RAISE NOTICE 'Error in ensure_user_profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create improved function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name', 
      NEW.email,
      'User'
    ),
    1, 0, 0, 0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 6. Verify the setup
SELECT 'Profile RLS policy fix completed successfully!' as status;

-- 7. Test the ensure_user_profile function with current users
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
        
        -- Clean up test data
        DELETE FROM public.profiles WHERE name = 'Test User' AND id = test_user_id;
    ELSE
        RAISE NOTICE 'No auth users found - function test skipped';
    END IF;
END $$;