-- Comprehensive database schema verification and fix
-- Run this script if you're experiencing column not found errors

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql;

-- Check and fix tasks table
DO $$
BEGIN
    -- Check if tasks table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        RAISE NOTICE 'Tasks table does not exist. Creating...';
        
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
        
        -- Create policies
        CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);
        
    ELSE
        RAISE NOTICE 'Tasks table exists. Checking columns...';
        
        -- Check and add missing columns
        IF NOT column_exists('tasks', 'completed') THEN
            ALTER TABLE public.tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added completed column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'due_date') THEN
            ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added due_date column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'priority') THEN
            ALTER TABLE public.tasks ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
            RAISE NOTICE 'Added priority column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'xp_value') THEN
            ALTER TABLE public.tasks ADD COLUMN xp_value INTEGER DEFAULT 30;
            RAISE NOTICE 'Added xp_value column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'is_habit') THEN
            ALTER TABLE public.tasks ADD COLUMN is_habit BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_habit column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'streak') THEN
            ALTER TABLE public.tasks ADD COLUMN streak INTEGER DEFAULT 0;
            RAISE NOTICE 'Added streak column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'completed_at') THEN
            ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added completed_at column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'created_at') THEN
            ALTER TABLE public.tasks ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added created_at column to tasks table';
        END IF;
        
        IF NOT column_exists('tasks', 'updated_at') THEN
            ALTER TABLE public.tasks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updated_at column to tasks table';
        END IF;
    END IF;
END $$;

-- Check and fix goals table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
        RAISE NOTICE 'Goals table does not exist. Creating...';
        
        CREATE TABLE public.goals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            deadline TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Check and fix profiles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE NOTICE 'Profiles table does not exist. Creating...';
        
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT,
            avatar_url TEXT,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Display final table structures
SELECT 'TASKS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'GOALS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;

SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Clean up helper function
DROP FUNCTION IF EXISTS column_exists(text, text);

SELECT 'Schema verification and fix completed!' as status;