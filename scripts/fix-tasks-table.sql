-- Fix tasks table schema
-- Run this script in Supabase SQL Editor to ensure the tasks table has all required columns

-- First, let's check if the table exists and what columns it has
DO $$
BEGIN
    -- Drop and recreate the tasks table to ensure it has all required columns
    DROP TABLE IF EXISTS public.tasks CASCADE;
    
    -- Create the tasks table with all required columns
    CREATE TABLE public.tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        due_date TIMESTAMP WITH TIME ZONE,
        priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
        xp_value INTEGER DEFAULT 30,
        is_habit BOOLEAN DEFAULT FALSE,
        streak INTEGER DEFAULT 0,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own tasks"
        ON public.tasks
        FOR SELECT
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own tasks"
        ON public.tasks
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own tasks"
        ON public.tasks
        FOR UPDATE
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own tasks"
        ON public.tasks
        FOR DELETE
        USING (auth.uid() = user_id);
    
    -- Add updated_at trigger
    CREATE TRIGGER tasks_updated_at
        BEFORE UPDATE ON public.tasks
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    
    RAISE NOTICE 'Tasks table recreated successfully with all required columns';
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY ordinal_position;