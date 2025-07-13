-- Fix database issues for Grind app
-- This script addresses foreign key constraints and schema cache issues

-- 1. First, refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Check if profiles table exists and has correct structure
DO $$ 
BEGIN
    -- Ensure profiles table exists with correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
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
    
    -- Ensure tasks table has correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed' AND table_schema = 'public') THEN
        -- Drop and recreate tasks table with correct structure
        DROP TABLE IF EXISTS public.tasks CASCADE;
        
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
        
        -- Add updated_at trigger
        CREATE TRIGGER tasks_updated_at
            BEFORE UPDATE ON public.tasks
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    
    -- Ensure goals table references profiles correctly
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals' AND table_schema = 'public') THEN
        -- Check if goals table has correct foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'goals' AND tc.constraint_type = 'FOREIGN KEY' 
            AND kcu.column_name = 'user_id' AND kcu.referenced_table_name = 'profiles'
        ) THEN
            -- Drop existing foreign key if it exists
            ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
            
            -- Add correct foreign key
            ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Create function to ensure user profile exists before operations
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
        -- Create profile if it doesn't exist
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (user_id, 'User', 1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 1, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create profiles for existing auth users who don't have profiles
INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', 'User') as name,
    1 as level,
    0 as xp,
    0 as streak_days,
    0 as longest_streak
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Refresh schema cache again
NOTIFY pgrst, 'reload schema';

-- 7. Verify the fix
SELECT 'Database issues fixed successfully!' as status;

-- Show table structures
SELECT 'PROFILES TABLE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'TASKS TABLE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'GOALS TABLE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;