-- Comprehensive Goals Table Schema Fix
-- This script ensures the goals table has all required columns and constraints

-- First, let's check the current structure and add missing columns
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'user_id') THEN
        ALTER TABLE goals ADD COLUMN user_id UUID NOT NULL;
        RAISE NOTICE 'Added user_id column';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'title') THEN
        ALTER TABLE goals ADD COLUMN title TEXT NOT NULL;
        RAISE NOTICE 'Added title column';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'description') THEN
        ALTER TABLE goals ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;

    -- Add deadline column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'deadline') THEN
        ALTER TABLE goals ADD COLUMN deadline TIMESTAMPTZ;
        RAISE NOTICE 'Added deadline column';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'status') THEN
        ALTER TABLE goals ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'created_at') THEN
        ALTER TABLE goals ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'updated_at') THEN
        ALTER TABLE goals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'category') THEN
        ALTER TABLE goals ADD COLUMN category VARCHAR(50);
        RAISE NOTICE 'Added category column';
    END IF;

    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'priority') THEN
        ALTER TABLE goals ADD COLUMN priority VARCHAR(10) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column';
    END IF;

    -- Add target_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'target_value') THEN
        ALTER TABLE goals ADD COLUMN target_value INTEGER DEFAULT 100;
        RAISE NOTICE 'Added target_value column';
    END IF;

    -- Add progress_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'progress_value') THEN
        ALTER TABLE goals ADD COLUMN progress_value INTEGER DEFAULT 0;
        RAISE NOTICE 'Added progress_value column';
    END IF;

    -- Add unit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'unit') THEN
        ALTER TABLE goals ADD COLUMN unit VARCHAR(20);
        RAISE NOTICE 'Added unit column';
    END IF;

    -- Add color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'color') THEN
        ALTER TABLE goals ADD COLUMN color VARCHAR(20);
        RAISE NOTICE 'Added color column';
    END IF;

    -- Add cover_image column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'goals' AND column_name = 'cover_image') THEN
        ALTER TABLE goals ADD COLUMN cover_image TEXT;
        RAISE NOTICE 'Added cover_image column';
    END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Foreign key to profiles table (assuming user_id references profiles)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_goals_user_id' AND table_name = 'goals') THEN
        -- Check if profiles table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE goals ADD CONSTRAINT fk_goals_user_id 
                FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint to profiles table';
        ELSE
            RAISE NOTICE 'Profiles table does not exist, skipping foreign key constraint';
        END IF;
    END IF;
END $$;

-- Enable RLS (Row Level Security) if not already enabled
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Create RLS policies
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Update existing goals to have proper default values
UPDATE goals SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE goals SET priority = 'medium' WHERE priority IS NULL OR priority = '';
UPDATE goals SET target_value = 100 WHERE target_value IS NULL OR target_value = 0;
UPDATE goals SET progress_value = 0 WHERE progress_value IS NULL;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at_column();

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'goals' 
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'goals';

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'goals';

RAISE NOTICE 'Goals table schema has been updated successfully!';