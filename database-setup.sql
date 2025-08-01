-- Database Setup for Grind App
-- Run this COMPLETE SQL script in your Supabase SQL Editor
-- 
-- IMPORTANT: Copy and paste this ENTIRE script into the SQL Editor and click "Run"
-- This will create all necessary tables, policies, and functions for the app to work
--
-- After running this script, return to the app and click "Check Setup"

-- Drop existing tables if they exist to avoid foreign key conflicts
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.milestones CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.check_user_exists(UUID);
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enable RLS for goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for goals
CREATE POLICY "Users can view their own goals"
  ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Enable RLS for milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for milestones
CREATE POLICY "Users can view milestones of their goals"
  ON public.milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert milestones for their goals"
  ON public.milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones of their goals"
  ON public.milestones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones of their goals"
  ON public.milestones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- 10. Create tasks table
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

-- 11. Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for tasks
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

-- 13. Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
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

-- 14. Enable RLS for journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for journal_entries
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

-- 16. Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16b. Create function to ensure user profile exists (for manual profile creation)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User')
RETURNS BOOLEAN AS $
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
  VALUES (user_id, user_name, 1, 0, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 19. Add updated_at triggers to all tables
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 20. Create storage bucket for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 21. Create storage policy for profile pictures
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 22. Create function to check if user exists in auth.users
CREATE OR REPLACE FUNCTION public.check_user_exists(user_id UUID)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. Create exec_sql function for programmatic database setup (optional)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $
BEGIN
  EXECUTE sql;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Refresh schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- 25. Verify setup by selecting from profiles table
-- This should return an empty result set if everything is working
SELECT 'Database setup completed successfully!' as status;
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 26. Test foreign key relationships by creating a test profile and goal
-- This will verify that the foreign key constraints are working properly
DO $
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID from auth.users (if any exist)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test profile
        INSERT INTO public.profiles (id, name, level, xp, streak_days, longest_streak)
        VALUES (test_user_id, 'Test User', 1, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING;
        
        -- Try to insert a test goal
        INSERT INTO public.goals (user_id, title, description)
        VALUES (test_user_id, 'Test Goal', 'This is a test goal')
        ON CONFLICT DO NOTHING;
        
        -- Clean up test data
        DELETE FROM public.goals WHERE title = 'Test Goal';
        DELETE FROM public.profiles WHERE name = 'Test User' AND id = test_user_id;
        
        RAISE NOTICE 'Foreign key relationships verified successfully!';
    ELSE
        RAISE NOTICE 'No auth users found - foreign key test skipped';
    END IF;
END $;

SELECT 'Database setup and verification completed!' as final_status;

-- 27. Display table structures for verification
SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 'GOALS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;