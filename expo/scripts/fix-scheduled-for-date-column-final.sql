-- FINAL FIX: Add scheduled_for_date column and fix all database issues
-- This script fixes the missing scheduled_for_date column that's causing task insertion failures
-- Run this in your Supabase SQL Editor

BEGIN;

-- Drop and recreate the tasks table with proper schema
DROP TABLE IF EXISTS public.tasks CASCADE;

CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('streak', 'today', 'regular', 'milestone')) DEFAULT 'regular',
    task_date DATE, -- For streak tasks
    due_at TIMESTAMPTZ, -- For today tasks
    scheduled_for_date DATE NOT NULL, -- Required field for all tasks
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    load_score INTEGER DEFAULT 1 CHECK (load_score BETWEEN 1 AND 5),
    proof_mode TEXT DEFAULT 'flex' CHECK (proof_mode IN ('flex', 'realtime')),
    xp_value INTEGER DEFAULT 10,
    is_habit BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint to ensure proper task type data
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_shape CHECK (
    (type = 'streak' AND task_date IS NOT NULL AND due_at IS NULL) OR
    (type = 'today' AND due_at IS NOT NULL AND task_date IS NULL) OR
    (type IN ('regular', 'milestone'))
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX idx_tasks_scheduled_for_date ON public.tasks(scheduled_for_date);
CREATE INDEX idx_tasks_user_scheduled ON public.tasks(user_id, scheduled_for_date);
CREATE INDEX idx_tasks_goal_scheduled ON public.tasks(goal_id, scheduled_for_date);
CREATE INDEX idx_tasks_type ON public.tasks(type);
CREATE INDEX idx_tasks_completed ON public.tasks(completed);
CREATE INDEX idx_tasks_task_date ON public.tasks(task_date) WHERE task_date IS NOT NULL;
CREATE INDEX idx_tasks_due_at ON public.tasks(due_at) WHERE due_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Tasks table recreated with scheduled_for_date column!' as status;

-- Display table structure
SELECT 'TASKS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;