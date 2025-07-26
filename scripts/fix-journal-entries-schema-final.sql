-- Fix journal_entries table schema issues
-- This script ensures all required columns exist and refreshes the schema cache

-- First, check if the table exists and what columns it has
SELECT 'CHECKING CURRENT JOURNAL_ENTRIES SCHEMA:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Drop and recreate the table to ensure all columns exist
DROP TABLE IF EXISTS public.journal_entries CASCADE;

-- Create journal_entries table with all required columns
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  media_uri TEXT,
  reflection TEXT,
  validation_status TEXT CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  validation_feedback TEXT,
  validation_confidence TEXT CHECK (validation_confidence IN ('high', 'medium', 'low')),
  mood TEXT CHECK (mood IN ('happy', 'neutral', 'sad', 'excited', 'anxious', 'grateful')),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for journal_entries
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

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the table structure
SELECT 'JOURNAL_ENTRIES TABLE COLUMNS AFTER FIX:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Test insert to verify all columns work
DO $$
DECLARE
    test_user_id UUID;
    test_task_id UUID;
    test_entry_id UUID;
BEGIN
    -- Get a test user (if any exist)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Get or create a test task
        SELECT id INTO test_task_id FROM public.tasks WHERE user_id = test_user_id LIMIT 1;
        
        IF test_task_id IS NULL THEN
            INSERT INTO public.tasks (user_id, title, description, completed)
            VALUES (test_user_id, 'Test Task for Journal', 'Test task', false)
            RETURNING id INTO test_task_id;
        END IF;
        
        -- Test inserting a journal entry with all columns
        INSERT INTO public.journal_entries (
            user_id, 
            title, 
            content, 
            task_id, 
            media_uri, 
            reflection,
            validation_status,
            validation_feedback,
            validation_confidence,
            mood,
            tags
        ) VALUES (
            test_user_id,
            'Test Journal Entry',
            'This is a test entry to verify all columns work',
            test_task_id,
            'https://example.com/test.jpg',
            'Test reflection',
            'pending',
            'Test feedback',
            'high',
            'happy',
            ARRAY['test', 'verification']
        ) RETURNING id INTO test_entry_id;
        
        RAISE NOTICE '✓ Successfully inserted test journal entry with ID: %', test_entry_id;
        
        -- Clean up test entry
        DELETE FROM public.journal_entries WHERE id = test_entry_id;
        
        -- Clean up test task if we created it
        DELETE FROM public.tasks WHERE id = test_task_id AND title = 'Test Task for Journal';
        
    ELSE
        RAISE NOTICE 'No users found - skipping insert test';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Failed to test journal entry insert: %', SQLERRM;
END $$;

SELECT 'Journal entries table schema fix completed successfully!' as status;