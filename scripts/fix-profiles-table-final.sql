-- FIX PROFILES TABLE - ADD MISSING FULL_NAME COLUMN
-- This script adds the missing 'full_name' column to the profiles table
-- Run this in your Supabase SQL Editor

BEGIN;

-- Check current profiles table structure
SELECT 'CURRENT PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Add missing columns to profiles table
DO $$ 
BEGIN
    -- Add full_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to profiles table';
    ELSE
        RAISE NOTICE 'Full_name column already exists in profiles table';
    END IF;

    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    ELSE
        RAISE NOTICE 'Email column already exists in profiles table';
    END IF;

    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    ELSE
        RAISE NOTICE 'Avatar_url column already exists in profiles table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to profiles table';
    ELSE
        RAISE NOTICE 'Updated_at column already exists in profiles table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

COMMIT;

-- Force schema cache refresh for PostgREST/Supabase
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Profiles table schema updated successfully! The full_name column has been added.' as status;

-- Display final table structure
SELECT 'FINAL PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;