# Journal Entries Database Fix

## Problem
The journal_entries table is missing required columns (`media_uri`, `task_id`, `reflection`) that are needed for task completion functionality.

## Solution
Run the SQL script to recreate the journal_entries table with all required columns.

## Steps to Fix

### 1. Run the Database Fix Script
Execute the following SQL script in your Supabase SQL editor:

```sql
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

SELECT 'Journal entries table schema fix completed successfully!' as status;
```

### 2. Verify the Fix
After running the script, you should see:
- ✅ All required columns exist in the journal_entries table
- ✅ RLS policies are properly configured
- ✅ Task completion should work without errors

### 3. Test Task Completion
1. Try completing a task with the "Complete Task" button
2. Upload an image for proof
3. Add journal content
4. Submit the task completion

## Expected Columns in journal_entries Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to profiles)
- `title` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL)
- `task_id` (UUID, Foreign Key to tasks) ← **This was missing**
- `media_uri` (TEXT) ← **This was missing**
- `reflection` (TEXT) ← **This was missing**
- `validation_status` (TEXT with CHECK constraint)
- `validation_feedback` (TEXT)
- `validation_confidence` (TEXT with CHECK constraint)
- `mood` (TEXT with CHECK constraint)
- `tags` (TEXT[])
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## What This Fixes
- ❌ "Could not find the 'media_uri' column" error
- ❌ "Could not find the 'task_id' column" error
- ❌ "Could not find the 'reflection' column" error
- ❌ "Failed to create journal entry" error
- ❌ Task completion failures

After running this fix, task completion should work properly and journal entries will be created successfully.