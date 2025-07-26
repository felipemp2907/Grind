# Journal Entries Database Fix

## Issue
The app was failing to complete tasks with the following errors:
- `Could not find the 'media_uri' column of 'journal_entries' in the schema cache`
- `Could not find the 'reflection' column of 'journal_entries' in the schema cache`
- `Journal entry creation returned null`
- `Error completing task: [Error: Failed to create journal entry]`

## Root Cause
The Supabase schema cache was not recognizing the `media_uri` and `reflection` columns in the `journal_entries` table, even though they were defined in the database schema. This can happen when:
1. The table was modified without properly refreshing the schema cache
2. There were inconsistencies in the table structure
3. The PostgREST cache needed to be refreshed

## Solution
Run the following SQL script in your Supabase SQL Editor:

```sql
-- scripts/fix-journal-entries-complete.sql
```

This script:
1. Drops and recreates the `journal_entries` table with all required columns
2. Re-establishes Row Level Security (RLS) policies
3. Recreates the updated_at trigger
4. Forces a schema cache refresh with `NOTIFY pgrst, 'reload schema'`
5. Verifies the table structure

## Required Columns
The `journal_entries` table now includes all these columns:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to profiles)
- `title` (TEXT, required)
- `content` (TEXT, required)
- `task_id` (UUID, foreign key to tasks, nullable)
- `media_uri` (TEXT, nullable) - **This was missing from cache**
- `reflection` (TEXT, nullable) - **This was missing from cache**
- `validation_status` (TEXT with check constraint)
- `validation_feedback` (TEXT, nullable)
- `validation_confidence` (TEXT with check constraint)
- `mood` (TEXT with check constraint)
- `tags` (TEXT array)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## How to Apply the Fix
1. Copy the contents of `scripts/fix-journal-entries-complete.sql`
2. Go to your Supabase project dashboard
3. Navigate to the SQL Editor
4. Paste the script and click "Run"
5. Verify the output shows all columns are present
6. Test task completion in the app

## Verification
After running the script, you should see:
- All journal entry columns listed in the output
- Task completion works without errors
- Journal entries are created successfully with media_uri and reflection fields

## Prevention
To prevent this issue in the future:
- Always use `NOTIFY pgrst, 'reload schema';` after schema changes
- Test critical app functions after database modifications
- Monitor logs for schema cache related errors