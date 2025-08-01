# Streak Preseed System Implementation

## Overview

This document outlines the comprehensive implementation of the Fixed-Duration Streak Tasks system with Deadline Guards for the Hustle app. The system ensures that streak tasks are generated once when an ultimate goal is created and appear consistently every day until the goal deadline.

## Key Features Implemented

### 1. Database Schema Updates

**New Columns Added:**
- `tasks.task_date` (DATE) - Stores the specific date for streak tasks
- `tasks.type` (TEXT) - Distinguishes between 'today' and 'streak' tasks  
- `goals.status` (TEXT) - Tracks goal status ('active', 'completed', 'abandoned')

**Database Constraints:**
```sql
-- Ensures proper task_date usage based on task type
ALTER TABLE public.tasks
ADD CONSTRAINT chk_task_date_by_type
CHECK (
    (type = 'today' AND task_date IS NULL) OR
    (type = 'streak' AND task_date IS NOT NULL)
);
```

**Performance Indexes:**
- `idx_tasks_date` - Fast calendar lookups
- `idx_tasks_type` - Efficient type filtering
- `idx_tasks_user_type_date` - Composite index for complex queries

### 2. Streak Task Generation (Once per Goal)

**When:** Triggered when an ultimate goal is created
**What:** Generates exactly 3 streak tasks for every day from today until the deadline
**How:**

```typescript
// Example: 30-day goal = 90 streak tasks (3 per day × 30 days)
const daysToDeadline = calculateDaysToDeadline(deadline);
const streakTemplate = buildStreakTemplate(goal); // Returns 3 tasks

for (let dayOffset = 0; dayOffset < daysToDeadline; dayOffset++) {
  const currentDate = new Date(today);
  currentDate.setDate(today.getDate() + dayOffset);
  const dateString = currentDate.toISOString().split('T')[0];
  
  for (const streakItem of streakTemplate) {
    streakTasks.push({
      // ... task properties
      type: 'streak',
      task_date: dateString,
      is_habit: true
    });
  }
}
```

### 3. Today Task Generation (On Demand)

**When:** User clicks "Generate AI Tasks" button
**What:** Creates only today tasks (type = 'today'), never regenerating streak tasks
**Limits:** Maximum 3 today tasks per goal per day

```typescript
// Today tasks have different structure
{
  type: 'today',
  task_date: null,           // Always null for today tasks
  due_date: targetDate,      // Uses due_date instead
  is_habit: false           // Never habits
}
```

### 4. Deadline Respect System

**Goal Filtering:**
```typescript
const getActiveGoalsForDate = (date: string, goals: Goal[]) => {
  const targetDate = new Date(date);
  return goals.filter(goal => {
    if (goal.status !== 'active') return false;
    const deadline = new Date(goal.deadline);
    return deadline.getTime() >= targetDate.getTime();
  });
};
```

**UI Guards:**
- Generate button disabled for dates beyond latest active goal deadline
- Tooltip shows "No active goals on this date" when disabled
- Calendar integration shows yellow dots only until deadline

### 5. Calendar Integration

**Yellow Dot Logic:**
- Every day from today until goal deadline shows yellow dots
- Indicates presence of streak tasks for that date
- Provides visual confirmation of consistent daily habits

### 6. Error Handling & Fallbacks

**AI Response Parsing:**
```typescript
const cleanJsonResponse = (response: string): string => {
  // Remove HTML tags, markdown formatting
  let cleaned = response.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Extract JSON if embedded in text
  if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
    const arrayMatch = cleaned.match(/\[[\\s\\S]*?\]/g);
    if (arrayMatch) cleaned = arrayMatch[0];
    else return '[]'; // Fallback
  }
  
  // Validate JSON before returning
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (error) {
    return '[]'; // Fallback
  }
};
```

**Fallback Tasks:**
- When AI fails, system provides sensible default tasks
- Maintains app functionality even during API issues
- Logs errors for debugging while continuing operation

## Files Modified

### Backend (tRPC Routes)
- `backend/trpc/routes/goals/create-ultimate-goal.ts` - Streak generation logic
- `backend/trpc/routes/tasks/generate-today-tasks.ts` - Today task generation with deadline guards
- `backend/trpc/create-context.ts` - Fixed TypeScript imports

### Database
- `scripts/apply-migration-comprehensive.sql` - Complete migration script
- `scripts/20240730_streak_preseed.sql` - Original migration with fixes

### Utilities
- `utils/aiUtils.ts` - Enhanced JSON parsing and error handling
- `utils/streakUtils.ts` - Streak template generation and date calculations

### UI Fixes
- `app/(tabs)/_layout.tsx` - Fixed TypeScript null handling issues
- `app/(tabs)/settings.tsx` - Fixed edit button contrast issue

## Testing

**Comprehensive Test Suite:**
- `__tests__/streak-preseed-comprehensive.test.js` - Full system testing
- Database constraint validation
- Streak generation verification
- Deadline guard testing
- Error handling validation
- Performance testing for large datasets

## Migration Instructions

1. **Apply Database Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy contents of scripts/apply-migration-comprehensive.sql
   ```

2. **Verify Schema:**
   ```sql
   -- Check new columns exist
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'tasks' AND column_name IN ('task_date', 'type');
   ```

3. **Test Goal Creation:**
   - Create a new ultimate goal
   - Verify streak tasks appear in calendar
   - Check task generation respects deadlines

## Key Benefits

✅ **Consistency:** Streak tasks appear every day until goal completion
✅ **Performance:** Batch processing handles large datasets efficiently  
✅ **Reliability:** Comprehensive error handling with fallbacks
✅ **User Experience:** Clear visual indicators and deadline respect
✅ **Data Integrity:** Database constraints prevent invalid states
✅ **Scalability:** Indexed queries support growing user base

## Monitoring & Maintenance

**Key Metrics to Monitor:**
- Streak task generation success rate
- AI response parsing failure rate
- Database constraint violations
- Task generation performance times

**Regular Maintenance:**
- Monitor database index performance
- Review AI response patterns for parsing improvements
- Validate streak task distribution across calendar
- Check deadline guard effectiveness

## Future Enhancements

**Potential Improvements:**
- Dynamic streak template adjustment based on user progress
- Streak task difficulty scaling over time
- Advanced deadline management (extensions, modifications)
- Streak task completion analytics and insights

---

*Implementation completed: August 1, 2025*
*System Status: ✅ Ready for Production*