-- Fix Streak Tasks Issue - Run this in Supabase SQL Editor
-- This script ensures the database schema is correct and creates test data

-- 1. First, let's make sure the goals table has the required columns
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Make sure the tasks table has all required columns
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'today',
ADD COLUMN IF NOT EXISTS task_date DATE,
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS xp_value INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_date ON tasks(user_id, type, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_type ON tasks(goal_id, type);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);

-- 4. Clean up any existing test data (OPTIONAL - remove if you want to keep existing data)
-- DELETE FROM tasks WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%test%');
-- DELETE FROM goals WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%test%');

-- 5. Create a test goal with streak tasks (replace 'YOUR_USER_ID' with your actual user ID)
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Example (uncomment and replace YOUR_USER_ID):
/*
DO $$
DECLARE
    test_user_id UUID := 'YOUR_USER_ID'; -- Replace with your actual user ID
    test_goal_id UUID;
    current_date_str TEXT;
    i INTEGER;
BEGIN
    -- Create a test goal
    INSERT INTO goals (user_id, title, description, deadline, status, created_at, updated_at)
    VALUES (
        test_user_id,
        'Test Ultimate Goal - Learn Programming',
        'Master full-stack development in 30 days',
        (CURRENT_DATE + INTERVAL '30 days')::timestamp,
        'active',
        NOW(),
        NOW()
    )
    RETURNING id INTO test_goal_id;
    
    -- Create streak tasks for the next 30 days
    FOR i IN 0..29 LOOP
        current_date_str := (CURRENT_DATE + (i || ' days')::interval)::date::text;
        
        -- Create 3 streak tasks per day
        INSERT INTO tasks (user_id, goal_id, title, description, type, task_date, is_habit, xp_value, priority, completed, created_at, updated_at)
        VALUES 
        (test_user_id, test_goal_id, 'Code for 1 hour', 'Practice coding fundamentals', 'streak', current_date_str::date, true, 50, 'high', false, NOW(), NOW()),
        (test_user_id, test_goal_id, 'Read programming articles', 'Stay updated with latest tech trends', 'streak', current_date_str::date, true, 30, 'medium', false, NOW(), NOW()),
        (test_user_id, test_goal_id, 'Practice problem solving', 'Solve coding challenges', 'streak', current_date_str::date, true, 40, 'medium', false, NOW(), NOW());
    END LOOP;
    
    RAISE NOTICE 'Created test goal with ID: % and 90 streak tasks', test_goal_id;
END $$;
*/

-- 6. Verify the data was created correctly
-- SELECT 
--     g.title as goal_title,
--     COUNT(t.id) as total_tasks,
--     COUNT(CASE WHEN t.type = 'streak' THEN 1 END) as streak_tasks,
--     COUNT(CASE WHEN t.type = 'today' THEN 1 END) as today_tasks
-- FROM goals g
-- LEFT JOIN tasks t ON g.id = t.goal_id
-- WHERE g.user_id = 'YOUR_USER_ID'  -- Replace with your user ID
-- GROUP BY g.id, g.title;

-- 7. Check today's streak tasks specifically
-- SELECT 
--     t.title,
--     t.description,
--     t.type,
--     t.task_date,
--     t.is_habit,
--     t.xp_value,
--     g.title as goal_title
-- FROM tasks t
-- JOIN goals g ON t.goal_id = g.id
-- WHERE t.user_id = 'YOUR_USER_ID'  -- Replace with your user ID
--   AND t.type = 'streak'
--   AND t.task_date = CURRENT_DATE
-- ORDER BY t.created_at;

-- 8. Enable RLS policies if they don't exist
DO $$
BEGIN
    -- Enable RLS on tables
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    -- Create policies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can manage their own goals') THEN
        CREATE POLICY "Users can manage their own goals" ON goals
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can manage their own tasks') THEN
        CREATE POLICY "Users can manage their own tasks" ON tasks
        FOR ALL USING (auth.uid() = user_id);
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS policies may already exist or there was an error: %', SQLERRM;
END $$;

-- 9. Final verification query - run this to check everything is working
SELECT 
    'Database schema check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') 
        THEN '✅ goals.status column exists'
        ELSE '❌ goals.status column missing'
    END as status_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') 
        THEN '✅ tasks.type column exists'
        ELSE '❌ tasks.type column missing'
    END as type_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_date') 
        THEN '✅ tasks.task_date column exists'
        ELSE '❌ tasks.task_date column missing'
    END as task_date_column;

-- Instructions:
-- 1. Copy this entire script
-- 2. Go to your Supabase project dashboard
-- 3. Click on "SQL Editor" in the left sidebar
-- 4. Paste this script and click "Run"
-- 5. If you want to create test data, uncomment the section in step 5 and replace 'YOUR_USER_ID' with your actual user ID
-- 6. To find your user ID, run: SELECT id FROM auth.users WHERE email = 'your-email@example.com';