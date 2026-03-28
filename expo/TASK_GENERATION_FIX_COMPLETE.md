# Task Generation Fix - Complete Solution

## Issues Fixed

### 1. Database Constraint Violations
**Problem**: The `tasks_type_shape` constraint was too strict, requiring:
- For 'streak' tasks: `task_date` must be NOT NULL and `due_at` must be NULL
- For 'today' tasks: `task_date` must be NULL and `due_at` must be NOT NULL

**Solution**: 
- Updated `setTaskDatesForKind` function in `/lib/db/tasksColumnMap.ts` to properly set and clear the correct date fields based on task type
- Created a more flexible database constraint script

### 2. Streak Tasks Stopping Early
**Problem**: Streak tasks were stopping in October 2025 when the goal deadline was set to April 2026

**Root Cause**: The blueprint functions were clamping the maximum days:
- Generic blueprint: max 365 days (1 year)
- Muscle blueprint: max 365 days (1 year)
- Language blueprint: max 730 days (2 years)

**Solution**: Increased all blueprint clamp limits to 1825 days (5 years) to support longer-term goals

### 3. Today Tasks Not Being Generated
**Problem**: "Today" tasks (non-streak scheduled tasks) were not being generated at all

**Root Cause**: The date field mapping was incorrect, causing constraint violations when inserting today tasks

**Solution**: Fixed the date field mapping logic to ensure proper date columns are set for each task type

## Files Modified

1. **`/lib/db/tasksColumnMap.ts`**
   - Fixed `setTaskDatesForKind` function to properly handle date fields for both streak and today tasks
   - Ensures `task_date` is set for streak tasks and `due_at` is set for today tasks
   - Clears mutually exclusive fields to avoid constraint violations

2. **`/lib/planner/blueprints.ts`**
   - Increased all blueprint day limits from 365-730 days to 1825 days (5 years)
   - This ensures tasks are generated for the entire goal period

3. **`/scripts/fix-task-constraints-flexible.sql`** (New file)
   - Creates a more flexible database constraint
   - Allows various date field combinations
   - Ensures at least one date field is set when type is specified

## How to Apply the Fix

### Step 1: Update Database Constraints
Run this SQL script in your Supabase SQL Editor:

```sql
-- Run the flexible constraints script
-- Located at: /scripts/fix-task-constraints-flexible.sql
```

### Step 2: Clear Existing Invalid Tasks (Optional)
If you have existing tasks with invalid data, you may want to clear them:

```sql
-- Delete tasks with invalid type/date combinations
DELETE FROM public.tasks 
WHERE (type = 'streak' AND task_date IS NULL)
   OR (type = 'today' AND due_at IS NULL);
```

### Step 3: Test Goal Creation
Create a new goal with a deadline far in the future (e.g., 2+ years) and verify:
1. Streak tasks are generated for every day until the deadline
2. Today tasks are generated according to the blueprint schedule
3. No constraint violations occur

## Verification

To verify the fix is working:

1. Check that streak tasks are generated up to the goal deadline:
```sql
SELECT 
  goal_id,
  type,
  COUNT(*) as task_count,
  MIN(task_date) as first_date,
  MAX(task_date) as last_date
FROM public.tasks
WHERE type = 'streak'
GROUP BY goal_id, type;
```

2. Check that today tasks are generated:
```sql
SELECT 
  goal_id,
  type,
  COUNT(*) as task_count,
  MIN(due_at::date) as first_date,
  MAX(due_at::date) as last_date
FROM public.tasks
WHERE type = 'today'
GROUP BY goal_id, type;
```

3. Verify no constraint violations:
```sql
-- This should return 0 rows
SELECT * FROM public.tasks
WHERE (type = 'streak' AND task_date IS NULL)
   OR (type = 'today' AND due_at IS NULL AND due_date IS NULL AND scheduled_for_date IS NULL);
```

## Summary

The fix addresses three main issues:
1. **Database constraints** were too strict - now more flexible
2. **Blueprint day limits** were too short - now support up to 5 years
3. **Date field mapping** was incorrect - now properly sets fields based on task type

With these changes, tasks should be generated correctly for the entire goal period, regardless of how far in the future the deadline is set.