# Journal Media URI Fix

## Problem
The error "Could not find the 'media_uri' column of 'journal_entries' in the schema cache" indicates that the Supabase database is missing the `media_uri` column in the `journal_entries` table, or the schema cache needs to be refreshed.

## Solution
Run the following SQL script in your Supabase SQL Editor to fix the issue:

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (usually in the left sidebar)

### Step 2: Run the Fix Script
Copy and paste the contents of this file into the SQL editor and run it:
```
scripts/fix-journal-entries-media-uri.sql
```

This script will:
1. Check if the `media_uri` column exists
2. Add it if it's missing
3. Add any other missing columns (reflection, validation fields, mood, tags, etc.)
4. Ensure RLS policies are properly set up
5. Force a schema cache refresh

### Step 3: Verify the Fix
After running the script, you should see output like:
- "✓ Added media_uri column to journal_entries table" (if it was missing)
- "✓ media_uri column already exists in journal_entries table" (if it already existed)
- A list of all columns in the journal_entries table

### Step 4: Test the Application
1. Try creating a new journal entry in your app
2. The error should no longer appear
3. Journal entries should save successfully

## What the Fix Does
The script safely:
- Adds the `media_uri` column if it doesn't exist (stores image/media URLs)
- Adds other journal-related columns that might be missing
- Sets up proper RLS (Row Level Security) policies
- Refreshes the Supabase schema cache

## Alternative: Complete Table Recreation
If the above doesn't work, you can use the more comprehensive fix that recreates the entire table:
```
scripts/fix-journal-entries-schema-final.sql
```
**Warning**: This will DROP and recreate the table, so you'll lose existing journal entries. Only use this if you don't have important data or have a backup.

## Code Implementation
The React Native code in `store/journalStore.ts` is already correctly handling the `media_uri` field:
- Line 46: Inserts `media_uri` when creating entries
- Line 138: Updates `media_uri` when editing entries  
- Line 250: Reads `media_uri` when fetching entries

No code changes are needed - just the database schema fix.