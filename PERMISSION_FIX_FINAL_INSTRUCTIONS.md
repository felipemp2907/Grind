# PERMISSION DENIED ERRORS - COMPLETE FIX INSTRUCTIONS

## Problem
You're getting "permission denied for table goals" and "permission denied for table tasks" errors because the Row Level Security (RLS) policies in your Supabase database are not properly configured to allow the service role to bypass them.

## Solution

### Step 1: Run the Ultimate Permissions Fix SQL Script

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `ovvihfhkhqigzahlttyf`

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the entire contents of `scripts/fix-permissions-ultimate-final.sql`**
   - This script will:
     - Create all required tables with proper columns
     - Enable Row Level Security (RLS) on all tables
     - Create comprehensive RLS policies that allow service role to bypass restrictions
     - Grant necessary permissions to authenticated and service_role
     - Create helper functions and triggers

4. **Run the script**
   - Click "Run" to execute the SQL script
   - Wait for it to complete successfully

### Step 2: Verify the Fix

After running the SQL script, you should see output like:
```
Ultimate permissions fix completed successfully
```

And a table showing your database tables with RLS enabled.

### Step 3: Test Goal Creation

1. **Try creating a goal in your app**
2. **Check the console logs** - you should see:
   ```
   Creating goal with admin client to bypass RLS...
   ✅ Goal created with ID: [some-uuid]
   🤖 Starting batch planner...
   ✅ Plan seeded successfully
   ```

## What This Fix Does

### 1. **Proper RLS Policies**
The script creates RLS policies that allow both:
- Regular users to access their own data (`auth.uid() = user_id`)
- Service role to bypass all restrictions (`auth.jwt() ->> 'role' = 'service_role'`)

### 2. **Service Role Configuration**
Your backend is now properly configured to:
- Use the service role key for admin operations
- Bypass RLS when creating goals and tasks
- Maintain user authentication for security

### 3. **Database Schema**
All required columns are added to tables:
- `goals`: status, category, target_value, unit, color, cover_image, priority
- `tasks`: status, type, task_date, due_at, load_score, proof_mode, completed, etc.
- `profiles`: full_name, level, xp, streak_days, longest_streak, experience_level

### 4. **Automatic Task Generation**
When you create an "Ultimate Goal", the system will:
1. Create the goal using admin permissions
2. Generate a complete daily plan using AI
3. Seed all streak and today tasks for every day until the deadline
4. All operations use the service role to bypass permission restrictions

## Expected Behavior After Fix

✅ **Goal creation works immediately**
✅ **Tasks are automatically generated for every day**
✅ **No more permission denied errors**
✅ **Calendar shows dots for all days with tasks**
✅ **Home screen shows today's tasks**

## If You Still Get Errors

1. **Check the SQL script ran completely** - look for any error messages in the SQL editor
2. **Verify your service role key** - make sure it matches what's in your backend code
3. **Check the console logs** - look for specific error messages about which operation failed

The service role key in your backend should be:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE0NDYwMiwiZXhwIjoyMDYyNzIwNjAyfQ.SCVexKSM6ktxwCnkq-mM8q6XoJsWCgiymSWcqmUde-Y
```

This matches what's already configured in your backend code, so no changes needed there.

## Summary

The core issue was that your RLS policies didn't allow the service role to bypass restrictions. The SQL script fixes this by:

1. Creating proper RLS policies with service role bypass
2. Granting necessary permissions to service_role
3. Ensuring all required database columns exist
4. Setting up proper constraints and indexes

After running this script, your goal creation and task generation should work perfectly without any permission errors.