-- Fix Foreign Key Constraints and User Profile Issues
-- Run this script in your Supabase SQL Editor to fix the foreign key constraint errors

-- 1. First, let's check if there are any orphaned goals (goals without corresponding profiles)
SELECT 'Checking for orphaned goals...' as status;

-- Show goals that reference non-existent profiles
SELECT g.id, g.user_id, g.title, 'ORPHANED - No profile exists' as issue
FROM public.goals g
LEFT JOIN public.profiles p ON g.user_id = p.id
WHERE p.id IS NULL;

-- 2. Check if there are auth users without profiles
SELECT 'Checking for auth users without profiles...' as status;

-- This will show users in auth.users who don't have corresponding profiles
SELECT au.id, au.email, 'MISSING PROFILE' as issue
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3. Create profiles for any auth users that don't have them
INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'User') as name,
    1 as level,
    0 as xp,
    0 as streak_days,
    0 as longest_streak
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Clean up any orphaned goals (delete goals that reference non-existent users)
DELETE FROM public.goals 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 5. Verify the foreign key constraint is working
SELECT 'Verifying foreign key constraints...' as status;

-- This should return 0 rows if everything is fixed
SELECT g.id, g.user_id, g.title, 'STILL ORPHANED' as issue
FROM public.goals g
LEFT JOIN public.profiles p ON g.user_id = p.id
WHERE p.id IS NULL;

-- 6. Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with error handling
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    1,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create a function to ensure profile exists (can be called from the app)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Create the profile
    INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
    VALUES (
      user_id,
      COALESCE(user_name, 'User'),
      1,
      0,
      0,
      0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to ensure profile for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 10. Final verification
SELECT 'Final verification...' as status;

-- Count profiles vs auth users
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles) 
    THEN 'COUNTS MATCH ✓' 
    ELSE 'COUNTS DO NOT MATCH ✗' 
  END as status;

-- Show any remaining issues
SELECT 
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM public.goals g 
      LEFT JOIN public.profiles p ON g.user_id = p.id 
      WHERE p.id IS NULL
    ) 
    THEN 'ORPHANED GOALS STILL EXIST ✗'
    ELSE 'NO ORPHANED GOALS ✓'
  END as goals_status;

SELECT 'Foreign key constraint fix completed!' as final_status;