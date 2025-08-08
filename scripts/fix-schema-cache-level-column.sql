-- Fix schema cache issue with 'level' column in profiles table
-- This script ensures the profiles table has the level column and forces a schema cache refresh

-- Step 1: Ensure the profiles table exists with all required columns
DO $$
DECLARE
    table_exists BOOLEAN;
    level_column_exists BOOLEAN;
    xp_column_exists BOOLEAN;
    streak_days_column_exists BOOLEAN;
    longest_streak_column_exists BOOLEAN;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Creating profiles table...';
        
        -- Create profiles table with all required columns
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
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
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
            
        RAISE NOTICE 'Profiles table created successfully!';
    ELSE
        RAISE NOTICE 'Profiles table exists. Checking and adding missing columns...';
        
        -- Check for missing columns
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'level'
        ) INTO level_column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'xp'
        ) INTO xp_column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'streak_days'
        ) INTO streak_days_column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'longest_streak'
        ) INTO longest_streak_column_exists;
        
        -- Add missing columns
        IF NOT level_column_exists THEN
            ALTER TABLE public.profiles ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;
            RAISE NOTICE 'Added level column to profiles table';
        END IF;
        
        IF NOT xp_column_exists THEN
            ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE 'Added xp column to profiles table';
        END IF;
        
        IF NOT streak_days_column_exists THEN
            ALTER TABLE public.profiles ADD COLUMN streak_days INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE 'Added streak_days column to profiles table';
        END IF;
        
        IF NOT longest_streak_column_exists THEN
            ALTER TABLE public.profiles ADD COLUMN longest_streak INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE 'Added longest_streak column to profiles table';
        END IF;
        
        -- Update existing profiles to have default values for any NULL columns
        UPDATE public.profiles 
        SET 
            level = COALESCE(level, 1),
            xp = COALESCE(xp, 0),
            streak_days = COALESCE(streak_days, 0),
            longest_streak = COALESCE(longest_streak, 0)
        WHERE level IS NULL OR xp IS NULL OR streak_days IS NULL OR longest_streak IS NULL;
        
        RAISE NOTICE 'Updated existing profiles with default values';
    END IF;
END $$;

-- Step 2: Recreate the ensure_user_profile function with proper error handling
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RAISE NOTICE 'User % does not exist in auth.users', user_id;
        RETURN FALSE;
    END IF;
    
    -- Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        -- Update existing profile to ensure all columns have values
        UPDATE public.profiles 
        SET 
            name = COALESCE(name, user_name),
            level = COALESCE(level, 1),
            xp = COALESCE(xp, 0),
            streak_days = COALESCE(streak_days, 0),
            longest_streak = COALESCE(longest_streak, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id;
        
        RAISE NOTICE 'Updated existing profile for user %', user_id;
    ELSE
        -- Insert new profile with all required columns
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (user_id, user_name, 1, 0, 0, 0);
        
        RAISE NOTICE 'Created new profile for user %', user_id;
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in ensure_user_profile: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the handle_new_user trigger function
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
    ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, profiles.name),
        level = COALESCE(profiles.level, 1),
        xp = COALESCE(profiles.xp, 0),
        streak_days = COALESCE(profiles.streak_days, 0),
        longest_streak = COALESCE(profiles.longest_streak, 0),
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add updated_at trigger to profiles table
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 7: Force multiple schema cache refreshes
-- This is crucial for Supabase to recognize the new columns
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify the table structure
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable,
    CASE WHEN column_name = 'level' THEN '*** LEVEL COLUMN ***' ELSE '' END as note
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 9: Test profile creation for existing users
DO $$
DECLARE
    test_user_id UUID;
    result BOOLEAN;
    profile_count INTEGER;
BEGIN
    -- Get a test user ID from auth.users (if any exist)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the ensure_user_profile function
        SELECT public.ensure_user_profile(test_user_id, 'Test User') INTO result;
        
        IF result THEN
            RAISE NOTICE 'ensure_user_profile function test: SUCCESS';
            
            -- Verify the profile was created/updated with all columns
            SELECT COUNT(*) INTO profile_count
            FROM public.profiles 
            WHERE id = test_user_id 
            AND level IS NOT NULL 
            AND xp IS NOT NULL 
            AND streak_days IS NOT NULL 
            AND longest_streak IS NOT NULL;
            
            IF profile_count > 0 THEN
                RAISE NOTICE 'Profile has all required columns with values';
                
                -- Show the actual values
                PERFORM (
                    SELECT RAISE(NOTICE, 'Profile values - level: %, xp: %, streak_days: %, longest_streak: %', 
                        level, xp, streak_days, longest_streak)
                    FROM public.profiles 
                    WHERE id = test_user_id
                );
            ELSE
                RAISE NOTICE 'WARNING: Profile missing some column values';
            END IF;
        ELSE
            RAISE NOTICE 'ensure_user_profile function test: FAILED';
        END IF;
    ELSE
        RAISE NOTICE 'No auth users found - function test skipped';
    END IF;
END $$;

-- Final status
SELECT 'Schema cache refresh and profiles table fix completed!' as status;
SELECT 'Please restart your application to ensure the schema cache is fully refreshed.' as recommendation;