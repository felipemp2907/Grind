-- Comprehensive Tasks Table Schema Fix
-- This script ensures the tasks table has all required columns and constraints

-- First, let's check the current structure and add missing columns
DO $$
BEGIN
    -- Add task_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'task_date') THEN
        ALTER TABLE tasks ADD COLUMN task_date DATE;
        RAISE NOTICE 'Added task_date column';
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE tasks ADD COLUMN type VARCHAR(20) DEFAULT 'today';
        RAISE NOTICE 'Added type column';
    END IF;

    -- Add is_habit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'is_habit') THEN
        ALTER TABLE tasks ADD COLUMN is_habit BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_habit column';
    END IF;

    -- Add xp_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'xp_value') THEN
        ALTER TABLE tasks ADD COLUMN xp_value INTEGER DEFAULT 10;
        RAISE NOTICE 'Added xp_value column';
    END IF;

    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE tasks ADD COLUMN priority VARCHAR(10) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column';
    END IF;

    -- Add goal_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'goal_id') THEN
        ALTER TABLE tasks ADD COLUMN goal_id UUID;
        RAISE NOTICE 'Added goal_id column';
    END IF;

    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date TIMESTAMPTZ;
        RAISE NOTICE 'Added due_date column';
    END IF;

    -- Add completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'completed') THEN
        ALTER TABLE tasks ADD COLUMN completed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added completed column';
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
        ALTER TABLE tasks ADD COLUMN user_id UUID NOT NULL;
        RAISE NOTICE 'Added user_id column';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'title') THEN
        ALTER TABLE tasks ADD COLUMN title TEXT NOT NULL;
        RAISE NOTICE 'Added title column';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'description') THEN
        ALTER TABLE tasks ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'created_at') THEN
        ALTER TABLE tasks ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'updated_at') THEN
        ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;

END $$;

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'chk_task_date_by_type' AND table_name = 'tasks') THEN
        ALTER TABLE tasks DROP CONSTRAINT chk_task_date_by_type;
        RAISE NOTICE 'Dropped existing chk_task_date_by_type constraint';
    END IF;
END $$;

-- Add the constraint for task_date based on type
ALTER TABLE tasks ADD CONSTRAINT chk_task_date_by_type
    CHECK (
        (type = 'today' AND task_date IS NULL) OR
        (type = 'streak' AND task_date IS NOT NULL)
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Foreign key to goals table
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tasks_goal_id' AND table_name = 'tasks') THEN
        ALTER TABLE tasks ADD CONSTRAINT fk_tasks_goal_id 
            FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to goals table';
    END IF;

    -- Foreign key to profiles table (assuming user_id references profiles)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tasks_user_id' AND table_name = 'tasks') THEN
        -- Check if profiles table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user_id 
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint to profiles table';
        ELSE
            RAISE NOTICE 'Profiles table does not exist, skipping foreign key constraint';
        END IF;
    END IF;
END $$;

-- Enable RLS (Row Level Security) if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Update existing tasks to have proper type values
UPDATE tasks SET type = 'today' WHERE type IS NULL OR type = '';
UPDATE tasks SET is_habit = false WHERE is_habit IS NULL;
UPDATE tasks SET completed = false WHERE completed IS NULL;
UPDATE tasks SET xp_value = 10 WHERE xp_value IS NULL OR xp_value = 0;
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL OR priority = '';

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'tasks';

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tasks';

RAISE NOTICE 'Tasks table schema has been updated successfully!';