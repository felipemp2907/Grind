# Streak Preseed and Deadline Guard System

## Overview

The Hustle app now implements a comprehensive **Fixed-Duration Streaks + Respect Deadlines** system that pre-seeds all streak tasks when an Ultimate Goal is created, ensuring consistent daily habits throughout the goal's duration while respecting goal deadlines.

## Key Features

### 1. Streak Pre-seeding
- **One-time Creation**: When an Ultimate Goal is created, the system generates exactly 3 streak tasks for every single day from today until the goal's deadline
- **Fixed Duration**: Streak tasks are created once and never regenerated, ensuring consistency
- **Calendar Integration**: Yellow dots appear on every day in the calendar until the deadline, showing streak task availability

### 2. Deadline Guard
- **Respect Deadlines**: The AI task generator only creates tasks for dates that fall within active goal deadlines
- **Smart Filtering**: If no goals cover a target date, the system returns a "completed" notice
- **UI Protection**: The "Generate AI Tasks" button is disabled for dates beyond the latest goal deadline

### 3. Database Schema


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

#### Task Types
- **`type='today'`**: AI-generated daily tasks, `task_date=NULL`, uses `due_date`
- **`type='streak'`**: Pre-seeded habit tasks, `task_date` set, `due_date=NULL`

## Implementation Details

### Goal Creation Process

1. **Create Goal**: Insert the goal record into the database
2. **Generate Streak Template**: Build 3 customized streak habits based on goal content
3. **Calculate Days**: Determine the inclusive range from today to deadline
4. **Batch Insert**: Create streak tasks for every day in the range
5. **Return Metadata**: Provide information about created tasks and duration

```typescript
// Example: 30-day goal creates 90 streak tasks (30 days × 3 tasks)
const daysToDeadline = calculateDaysToDeadline(deadline);
const totalStreakTasks = daysToDeadline * 3;
```

### Task Generation Process

1. **Fetch Goals**: Get all active goals for the user
2. **Apply Deadline Guard**: Filter goals that cover the target date
3. **Check Existing**: Verify what tasks already exist for the date
4. **Generate Today Tasks**: Create only "today" type tasks, never streak tasks
5. **Respect Limits**: Ensure tasks don't exceed goal deadlines

### Deadline Changes

- **Extended Deadline**: Automatically add streak tasks for new days
- **Shortened Deadline**: Remove streak tasks beyond the new deadline
- **Batch Operations**: Handle large numbers of tasks efficiently

## Usage Examples

### Creating a 30-Day Fitness Goal
```typescript
const goal = await trpc.goals.createUltimate.mutate({
  title: "Get Fit in 30 Days",
  description: "Complete daily workouts and track nutrition",
  deadline: "2024-08-30"
});

// Result: 90 streak tasks created (30 days × 3 habits)
// - Daily workout session
// - Track nutrition and hydration  
// - Recovery and stretching
```

### Generating Tasks for a Specific Date
```typescript
const result = await trpc.tasks.generateToday.mutate({
  targetDate: "2024-08-15"
});

// If date is within goal deadlines: generates today tasks
// If date exceeds all deadlines: returns { tasks: [], notice: 'completed' }
```

### Calendar Integration
```typescript
// Check if date has tasks
const hasStreakTasks = await checkStreakTasksForDate("2024-08-15");
// Show yellow dot if hasStreakTasks is true

// Disable button for dates beyond deadlines
const latestDeadline = Math.max(...goals.map(g => Date.parse(g.deadline)));
const isDisabled = selectedDate.getTime() > latestDeadline;
```

## Implementation Details

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

### For Users
- **Consistent Habits**: Same streak tasks appear every day until goal completion
- **Clear Progress**: Visual calendar indicators show commitment duration
- **No Surprises**: Predictable daily routine without unexpected changes

### For Performance
- **Efficient Queries**: Indexed lookups by date and type
- **Batch Operations**: Minimize database round trips
- **Smart Caching**: Pre-computed streak tasks reduce generation overhead

### For Data Integrity
- **Type Safety**: Database constraints prevent invalid task configurations
- **Deadline Respect**: No tasks created beyond goal deadlines
- **Consistent State**: Streak tasks remain unchanged after creation

## Testing

The system includes comprehensive tests covering:
- Database schema and constraints
- Streak task pre-seeding logic
- Deadline guard functionality
- Calendar integration
- Performance with large datasets
- Edge cases and error handling

Run tests with:
```bash
npm test __tests__/streak-preseed-deadline-guard.test.js
```

## Migration

To apply the database changes:
```bash
# Apply the migration
psql -d your_database -f scripts/20240730_streak_preseed.sql

# Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'task_date';
```

## Monitoring

Key metrics to monitor:
- **Streak Task Creation**: Number of tasks created per goal
- **Calendar Performance**: Query speed for date-based lookups  
- **Deadline Compliance**: Percentage of tasks within goal deadlines
- **User Engagement**: Completion rates for pre-seeded streak tasks

---

This system ensures that Hustle provides a consistent, predictable, and efficient experience for users working toward their Ultimate Goals while maintaining high performance and data integrity.