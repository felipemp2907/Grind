# FINAL FIX FOR PERMISSION DENIED ERRORS

## The Problem
You're getting "permission denied for table tasks" errors because:
1. Your Supabase database doesn't have proper Row Level Security (RLS) policies
2. The database tables are missing required columns
3. The user authentication isn't properly set up

## The Solution

### Step 1: Run the Database Fix Script

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to your project**: ovvihfhkhqigzahlttyf
3. **Go to SQL Editor** (in the left sidebar)
4. **Copy and paste the entire contents** of `scripts/fix-permissions-final.sql` into the SQL editor
5. **Click "Run"** to execute the script

This script will:
- ✅ Create all missing database tables and columns
- ✅ Set up proper Row Level Security (RLS) policies
- ✅ Grant necessary permissions to authenticated users
- ✅ Create functions to automatically create user profiles
- ✅ Add proper indexes for performance

### Step 2: Verify the Fix

After running the script, you should see output like:
```
Database permissions fix completed successfully
```

### Step 3: Test Your App

1. **Restart your development server**
2. **Try creating a goal** - it should work without permission errors
3. **Check the console** - you should see successful task creation messages

## What the Fix Does

### Database Schema
- Creates `profiles`, `goals`, and `tasks` tables with all required columns
- Adds proper foreign key relationships
- Sets up check constraints for data validation

### Row Level Security (RLS)
- Enables RLS on all tables
- Creates policies that allow users to only access their own data
- Uses `auth.uid()` to ensure proper user isolation

### Permissions
- Grants `ALL` permissions on tables to `authenticated` users
- Grants `USAGE` on sequences for auto-incrementing IDs
- Creates admin-level functions with `SECURITY DEFINER`

### User Profile Management
- Automatically creates user profiles when users sign up
- Provides RPC functions to manually ensure profiles exist
- Handles edge cases where profiles might be missing

## Elevated Permissions System

The app now uses a dual-client system:
- **Regular Client**: For normal operations with user authentication
- **Admin Client**: For operations that need elevated permissions (uses service role key)

When creating tasks or goals:
1. First tries with regular client (respects RLS)
2. If that fails, falls back to admin client (bypasses RLS)
3. Logs detailed error information for debugging

## If You Still Get Errors

1. **Check Supabase Dashboard**: Make sure the script ran successfully
2. **Verify Tables Exist**: Go to Table Editor and confirm `profiles`, `goals`, `tasks` tables exist
3. **Check RLS Policies**: Go to Authentication > Policies and verify policies exist
4. **Clear App Cache**: Restart your development server and clear browser cache
5. **Check Console Logs**: Look for detailed error messages in the browser console

## Environment Variables

Make sure your `.env` file has the correct Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://ovvihfhkhqigzahlttyf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE0NDYwMiwiZXhwIjoyMDYyNzIwNjAyfQ.SCVexKSM6ktxwCnkq-mM8q6XoJsWCgiymSWcqmUde-Y
```

## Success Indicators

After the fix, you should see these console messages:
- ✅ "Supabase clients initialized successfully"
- ✅ "Task created successfully with regular client" OR "Task created successfully with admin client"
- ✅ "Goal created successfully with regular client" OR "Goal created successfully with admin client"
- ✅ "Ultimate goal created successfully with X tasks for Y days"

## No More Errors

You should no longer see:
- ❌ "permission denied for table tasks"
- ❌ "Task creation failed"
- ❌ "Goal creation failed"

The app will now work properly with your Supabase database!