-- Fix for missing 'completed' column in tasks table
-- This script ensures the completed column exists and refreshes the schema cache

-- 1. Check current table structure
SELECT 'CURRENT TASKS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 2. Add completed column if it doesn't exist
DO $$
BEGIN
    -- Check if completed column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completed'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added completed column to tasks table';
    ELSE
        RAISE NOTICE 'completed column already exists in tasks table';
    END IF;
    
    -- Ensure other essential columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Task';
        RAISE NOTICE 'Added title column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added due_date column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'xp_value'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 30;
        RAISE NOTICE 'Added xp_value column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'is_habit'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_habit column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'streak'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN streak INTEGER DEFAULT 0;
        RAISE NOTICE 'Added streak column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column to tasks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to tasks table';
    END IF;
END $$;

-- 3. Ensure RLS policies exist for tasks
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND policyname = 'Users can view their own tasks'
    ) THEN
        CREATE POLICY "Users can view their own tasks"
          ON public.tasks
          FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND policyname = 'Users can insert their own tasks'
    ) THEN
        CREATE POLICY "Users can insert their own tasks"
          ON public.tasks
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND policyname = 'Users can update their own tasks'
    ) THEN
        CREATE POLICY "Users can update their own tasks"
          ON public.tasks
          FOR UPDATE
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND policyname = 'Users can delete their own tasks'
    ) THEN
        CREATE POLICY "Users can delete their own tasks"
          ON public.tasks
          FOR DELETE
          USING (auth.uid() = user_id);
    END IF;
    
    RAISE NOTICE 'RLS policies for tasks table verified/created';
END $$;

-- 4. Create or recreate the updated_at trigger for tasks
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Verify the final structure
SELECT 'UPDATED TASKS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 7. Test that we can insert a task with the completed column
DO $$
DECLARE
    test_user_id UUID;
    test_task_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Ensure the user has a profile
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (test_user_id, 'Test User', 1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;
        
        -- Test task creation with completed column
        INSERT INTO public.tasks (user_id, title, description, completed)
        VALUES (test_user_id, 'Test Task - Completed Column Check', 'Testing completed column', false)
        RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Successfully created test task with completed column. Task ID: %', test_task_id;
        
        -- Update the task to test completed column
        UPDATE public.tasks 
        SET completed = true, completed_at = CURRENT_TIMESTAMP 
        WHERE id = test_task_id;
        
        RAISE NOTICE 'Successfully updated task completed status';
        
        -- Clean up test data
        DELETE FROM public.tasks WHERE id = test_task_id;
        
        RAISE NOTICE 'Test completed successfully - completed column is working!';
    ELSE
        RAISE NOTICE 'No users found in auth.users table - cannot test task creation';
    END IF;
END $$;

SELECT 'Tasks table fix completed successfully!' as status;