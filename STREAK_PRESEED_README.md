# Streak Pre-seeding System

## Overview

The Hustle app implements a **Fixed-Duration Streak Pre-seeding System** that creates all streak tasks upfront when an Ultimate Goal is created, ensuring consistent daily habits throughout the goal's duration.

## Key Features

### 🎯 One-Time Streak Creation
- **When**: Streak tasks are generated ONCE when an Ultimate Goal is created
- **What**: Exactly 3 streak tasks per day from today until the goal's deadline
- **Where**: All tasks are stored in the database with `type='streak'` and specific `task_date`

### 📅 Calendar Integration
- **Yellow dots** appear on every single day from today until the deadline
- Each day shows the same 3 streak tasks (consistent habits)
- No gaps or missing days in the streak schedule

### 🚫 No Regeneration
- Streak tasks are **NEVER** regenerated or modified by the daily task generator
- The AI task generator only creates `type='today'` tasks
- Streak tasks remain identical throughout the goal's duration

## Database Schema

### Tasks Table Updates
```sql
-- New column for dated streak copies
ALTER TABLE public.tasks ADD COLUMN task_date DATE;

-- Constraint to ensure data integrity
ALTER TABLE public.tasks ADD CONSTRAINT chk_task_date_by_type 
CHECK (
    (type = 'today' AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);

-- Index for fast calendar lookups
CREATE INDEX idx_tasks_date ON public.tasks(task_date);
```

### Task Types
- **`type='today'`**: AI-generated daily tasks, `task_date=NULL`, uses `due_date`
- **`type='streak'`**: Pre-seeded habit tasks, `task_date` set, `due_date=NULL`

## Implementation Details

### Goal Creation Process
1. User creates Ultimate Goal with deadline
2. System builds streak template (3 habits based on goal category)
3. System calculates days from today to deadline (inclusive)
4. System creates `days × 3` streak tasks in batches
5. Each task gets assigned to a specific `task_date`

### Deadline Changes
- **Extended deadline**: Append streak tasks for additional days
- **Shortened deadline**: Delete streak tasks beyond new deadline
- **Same habits**: Maintain consistency across all dates

### Task Generation Guard
- AI generator checks goal deadlines before creating tasks
- Returns empty array if target date exceeds all goal deadlines
- Client disables "Generate AI Tasks" button for invalid dates

## Code Examples

### Creating Streak Tasks
```typescript
// Calculate days to deadline (inclusive)
const daysToDeadline = calculateDaysToDeadline(input.deadline);

// Create tasks for each day
for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
  const currentDate = new Date(today);
  currentDate.setDate(today.getDate() + dayOffset);
  const dateString = currentDate.toISOString().split('T')[0];
  
  for (const streakItem of streakTemplate) {
    streakTasks.push({
      user_id: user.id,
      goal_id: goalData.id,
      title: streakItem.title,
      description: streakItem.description,
      type: 'streak',
      task_date: dateString, // Key difference from today tasks
      is_habit: true,
      xp_value: streakItem.xpValue,
      priority: streakItem.priority,
      completed: false
    });
  }
}
```

### Client-side Date Guard
```typescript
const latestDeadline = useMemo(
  () => Math.max(...goals.map(g => Date.parse(g.deadline))),
  [goals]
);

const isPast = selectedDate.getTime() > latestDeadline;

<Button
  disabled={isPast}
  title="Generate AI Tasks"
  onPress={handleGenerate}
/>
```

## Benefits

### ✅ Consistency
- Same streak tasks appear every day
- No variation in habit requirements
- Predictable daily routine

### ✅ Performance
- No daily streak generation overhead
- Fast calendar rendering with pre-computed data
- Efficient database queries with indexed `task_date`

### ✅ Reliability
- No risk of missing streak tasks
- No dependency on daily generation processes
- Guaranteed habit coverage for entire goal duration

### ✅ User Experience
- Clear visual feedback in calendar (yellow dots)
- Immediate habit visibility upon goal creation
- No surprises or missing tasks

## Testing

The system includes comprehensive tests covering:
- Database schema validation
- Streak task creation logic
- Deadline guard functionality
- Calendar integration
- Batch processing
- Error handling

Run tests with:
```bash
npm test __tests__/streak-preseed-deadline-guard.test.js
```

## Migration

To apply the streak pre-seeding system:

1. Run the database migration:
```bash
# Apply the migration script
psql -f scripts/20240730_streak_preseed.sql
```

2. Update existing goals (if needed):
```sql
-- Backfill streak tasks for existing active goals
-- (This would be handled by a separate migration script)
```

## Monitoring

Key metrics to monitor:
- Streak task creation success rate
- Calendar rendering performance
- Database query efficiency
- User engagement with streak tasks

## Troubleshooting

### Common Issues
1. **Missing yellow dots**: Check if streak tasks were created during goal setup
2. **Duplicate tasks**: Verify constraint `chk_task_date_by_type` is working
3. **Performance issues**: Ensure `idx_tasks_date` index exists
4. **AI generation errors**: Check deadline guard logic

### Debug Queries
```sql
-- Check streak tasks for a goal
SELECT task_date, COUNT(*) 
FROM tasks 
WHERE goal_id = 'goal-id' AND type = 'streak' 
GROUP BY task_date 
ORDER BY task_date;

-- Verify constraint is working
SELECT type, task_date IS NULL as has_null_date, COUNT(*)
FROM tasks 
GROUP BY type, (task_date IS NULL);
```

This system ensures that Hustle users have a consistent, reliable streak experience that supports their long-term goal achievement.