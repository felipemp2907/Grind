-- Fix journal_entries table to ensure media_uri column exists
-- This script safely adds the media_uri column if it doesn't exist

-- First, check current journal_entries schema
SELECT 'Current journal_entries columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Add media_uri column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'media_uri'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN media_uri TEXT;
        RAISE NOTICE '✓ Added media_uri column to journal_entries table';
    ELSE
        RAISE NOTICE '✓ media_uri column already exists in journal_entries table';
    END IF;
END $$;

-- Add other potentially missing columns
DO $$
BEGIN
    -- Add reflection column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'reflection'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN reflection TEXT;
        RAISE NOTICE '✓ Added reflection column';
    END IF;

    -- Add validation_status column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN validation_status TEXT 
            CHECK (validation_status IN ('pending', 'approved', 'rejected'));
        RAISE NOTICE '✓ Added validation_status column';
    END IF;

    -- Add validation_feedback column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'validation_feedback'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN validation_feedback TEXT;
        RAISE NOTICE '✓ Added validation_feedback column';
    END IF;

    -- Add validation_confidence column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'validation_confidence'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN validation_confidence TEXT 
            CHECK (validation_confidence IN ('high', 'medium', 'low'));
        RAISE NOTICE '✓ Added validation_confidence column';
    END IF;

    -- Add mood column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'mood'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN mood TEXT 
            CHECK (mood IN ('happy', 'neutral', 'sad', 'excited', 'anxious', 'grateful'));
        RAISE NOTICE '✓ Added mood column';
    END IF;

    -- Add tags column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN tags TEXT[];
        RAISE NOTICE '✓ Added tags column';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.journal_entries ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✓ Added updated_at column';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the final table structure
SELECT 'Journal entries columns after fix:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

SELECT '✓ Journal entries media_uri fix completed successfully!' as status;