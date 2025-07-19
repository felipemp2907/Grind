-- Fix the tasks table to ensure completed column exists
-- This script specifically addresses the "Could not find the 'completed' column" error

-- First, check if the tasks table exists and what columns it has
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Check if tasks table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Tasks table exists';
        
        -- Check if completed column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'completed'
        ) INTO column_exists;
        
        IF column_exists THEN
            RAISE NOTICE 'Completed column already exists';
        ELSE
            RAISE NOTICE 'Adding completed column to tasks table';
            ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
        END IF;
    ELSE
        RAISE NOTICE 'Tasks table does not exist - creating it';
        
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
            
        -- Create updated_at trigger
        CREATE TRIGGER tasks_updated_at
            BEFORE UPDATE ON public.tasks
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the table structure
SELECT 'TASKS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'COMPLETED COLUMN CHECK:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tasks' 
            AND column_name = 'completed'
        ) THEN 'COMPLETED COLUMN EXISTS ✓'
        ELSE 'COMPLETED COLUMN MISSING ✗'
    END as status;