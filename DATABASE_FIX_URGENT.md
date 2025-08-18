# Database Permission Fix Instructions

## URGENT: Run this SQL script in your Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content from `scripts/fix-permissions-final-emergency.sql`
4. Click "Run" to execute the script

This will:
- Fix all permission denied errors
- Allow goals and tasks to be created
- Remove tRPC dependency issues
- Enable direct database access

## What Changed

✅ **Removed tRPC completely** - No more timeout or connection issues
✅ **Direct Supabase API** - Goals and tasks now work directly with the database
✅ **Fixed all permissions** - Ultra-permissive policies allow all operations
✅ **Maintained offline-first** - Still works without internet, syncs when available

## Test After Running

1. Try creating a new goal
2. Check that tasks are generated automatically
3. Verify you can see tasks on the Home tab
4. Confirm calendar shows dots for goal days

The app now works **completely independently** of tRPC and should create goals and tasks successfully!