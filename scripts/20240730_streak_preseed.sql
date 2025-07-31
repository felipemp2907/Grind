-- Database migration for fixed-duration streaks + deadline guard
-- Run this with: supabase db push

-- 1-a  new column for dated streak copies
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS task_date DATE;

-- 1-b  add type column to distinguish between today and streak tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('today', 'streak')) DEFAULT 'today';

-- 1-c  Drop existing constraint if it exists
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS chk_task_date_by_type;

-- 1-d  check that exactly one of (type, task_date) rules is respected
ALTER TABLE public.tasks
ADD CONSTRAINT chk_task_date_by_type
CHECK (
    (type = 'today'  AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);

-- 1-d  index for fast calendar look-ups
CREATE INDEX IF NOT EXISTS idx_tasks_date
ON public.tasks(task_date);

-- 1-e  index for fast type filtering
CREATE INDEX IF NOT EXISTS idx_tasks_type
ON public.tasks(type);

-- 2   helper view for active goals on a given day
CREATE OR REPLACE VIEW public.active_goals_for AS
SELECT *
FROM public.goals
WHERE user_id = auth.uid()      -- run-time uid
  AND deadline >= CURRENT_DATE; -- will be parameterised in RPC

-- 3   RPC function to get active goals for a specific date
CREATE OR REPLACE FUNCTION public.get_active_goals_for_date(target_date DATE)
RETURNS SETOF public.goals AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.goals
  WHERE user_id = auth.uid()
    AND deadline >= target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4   Function to create streak tasks for a goal across all dates
CREATE OR REPLACE FUNCTION public.create_streak_tasks_for_goal(
  goal_id_param UUID,
  streak_template JSONB
)
RETURNS INTEGER AS $$
DECLARE
  goal_record RECORD;
  streak_item JSONB;
  current_date DATE;
  tasks_created INTEGER := 0;
BEGIN
  -- Get the goal with its deadline
  SELECT * INTO goal_record
  FROM public.goals
  WHERE id = goal_id_param
    AND user_id = auth.uid();
    
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Loop through each day from today to deadline
  current_date := CURRENT_DATE;
  WHILE current_date <= goal_record.deadline::DATE LOOP
    -- Create streak tasks for this date
    FOR streak_item IN SELECT * FROM jsonb_array_elements(streak_template)
    LOOP
      INSERT INTO public.tasks (
        user_id,
        goal_id,
        title,
        description,
        type,
        task_date,
        is_habit,
        xp_value,
        priority,
        completed
      ) VALUES (
        auth.uid(),
        goal_id_param,
        streak_item->>'title',
        streak_item->>'description',
        'streak',
        current_date,
        true,
        COALESCE((streak_item->>'xpValue')::INTEGER, 20),
        COALESCE(streak_item->>'priority', 'medium'),
        false
      );
      
      tasks_created := tasks_created + 1;
    END LOOP;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN tasks_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5   Function to update streak tasks when goal deadline changes
CREATE OR REPLACE FUNCTION public.update_streak_tasks_for_deadline_change(
  goal_id_param UUID,
  old_deadline DATE,
  new_deadline DATE,
  streak_template JSONB
)
RETURNS INTEGER AS $$
DECLARE
  tasks_affected INTEGER := 0;
  streak_item JSONB;
  current_date DATE;
BEGIN
  IF new_deadline > old_deadline THEN
    -- Add missing dates
    current_date := old_deadline + INTERVAL '1 day';
    WHILE current_date <= new_deadline LOOP
      FOR streak_item IN SELECT * FROM jsonb_array_elements(streak_template)
      LOOP
        INSERT INTO public.tasks (
          user_id,
          goal_id,
          title,
          description,
          type,
          task_date,
          is_habit,
          xp_value,
          priority,
          completed
        ) VALUES (
          auth.uid(),
          goal_id_param,
          streak_item->>'title',
          streak_item->>'description',
          'streak',
          current_date,
          true,
          COALESCE((streak_item->>'xpValue')::INTEGER, 20),
          COALESCE(streak_item->>'priority', 'medium'),
          false
        );
        
        tasks_affected := tasks_affected + 1;
      END LOOP;
      
      current_date := current_date + INTERVAL '1 day';
    END LOOP;
  ELSIF new_deadline < old_deadline THEN
    -- Remove tasks beyond new deadline
    DELETE FROM public.tasks
    WHERE goal_id = goal_id_param
      AND type = 'streak'
      AND task_date > new_deadline
      AND user_id = auth.uid();
      
    GET DIAGNOSTICS tasks_affected = ROW_COUNT;
  END IF;
  
  RETURN tasks_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6   Trigger to automatically update streak tasks when goal deadline changes
CREATE OR REPLACE FUNCTION public.handle_goal_deadline_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle deadline changes
  IF OLD.deadline IS DISTINCT FROM NEW.deadline THEN
    -- Note: This would require the streak template to be stored somewhere
    -- For now, we'll handle this in the application layer
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goal deadline changes
DROP TRIGGER IF EXISTS goal_deadline_change_trigger ON public.goals;
CREATE TRIGGER goal_deadline_change_trigger
  AFTER UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_goal_deadline_change();

-- 7   Add status column to goals table if it doesn't exist
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active';

-- 8   Update existing tasks to have proper type
UPDATE public.tasks
SET type = CASE
  WHEN is_habit = true THEN 'streak'
  ELSE 'today'
END
WHERE type IS NULL;

-- 9   Update existing goals to have active status
UPDATE public.goals
SET status = 'active'
WHERE status IS NULL;

-- 10   Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Streak preseed migration completed successfully!' as status;