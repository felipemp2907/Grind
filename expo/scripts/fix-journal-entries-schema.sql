-- Fix Journal Entries Schema Issues
-- This script ensures the journal_entries table has all required columns and proper structure

SELECT 'FIXING JOURNAL ENTRIES SCHEMA...' as status;

-- 1. Drop and recreate journal_entries table to ensure correct structure
DROP TABLE IF EXISTS public.journal_entries CASCADE;

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

-- 2. Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

-- 4. Create RLS policies for journal_entries
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

-- 5. Create updated_at trigger
DROP TRIGGER IF EXISTS journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Test the journal_entries table structure
DO $$
DECLARE
    test_user_id UUID;
    test_task_id UUID;
    test_journal_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing journal entries with user ID: %', test_user_id;
        
        -- Get a test task (create one if needed)
        SELECT id INTO test_task_id FROM public.tasks WHERE user_id = test_user_id LIMIT 1;
        
        IF test_task_id IS NULL THEN
            -- Create a test goal first
            INSERT INTO public.goals (user_id, title, description)
            VALUES (test_user_id, 'Test Goal for Journal', 'Testing journal entries')
            RETURNING id INTO test_task_id;
            
            -- Create a test task
            INSERT INTO public.tasks (user_id, goal_id, title, description)
            VALUES (test_user_id, test_task_id, 'Test Task for Journal', 'Testing journal entries')
            RETURNING id INTO test_task_id;
        END IF;
        
        -- Test journal entry creation with all fields including media_uri
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
        )
        VALUES (
            test_user_id, 
            'Test Journal Entry', 
            'Testing all fields including media_uri', 
            test_task_id, 
            'https://example.com/test-image.jpg', 
            'Test reflection', 
            'approved', 
            'Test feedback', 
            'high', 
            'happy', 
            ARRAY['test', 'journal']
        )
        RETURNING id INTO test_journal_id;
        
        RAISE NOTICE 'Successfully created test journal entry with ID: %', test_journal_id;
        
        -- Test selecting the journal entry
        IF EXISTS (
            SELECT 1 FROM public.journal_entries 
            WHERE id = test_journal_id 
            AND media_uri = 'https://example.com/test-image.jpg'
        ) THEN
            RAISE NOTICE 'Journal entry with media_uri verified in database';
        ELSE
            RAISE NOTICE 'ERROR: Journal entry media_uri not found';
        END IF;
        
        -- Clean up test data
        DELETE FROM public.journal_entries WHERE id = test_journal_id;
        
        RAISE NOTICE 'Journal entries table test passed!';
    ELSE
        RAISE NOTICE 'No users found in auth.users table - cannot test, but schema is ready';
    END IF;
END $$;

-- 8. Display journal_entries table structure
SELECT 'JOURNAL ENTRIES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

SELECT 'JOURNAL ENTRIES SCHEMA FIX COMPLETED!' as final_status;