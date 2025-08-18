# PERMISSION FIX INSTRUCTIONS

## The Problem
You're getting "permission denied for table tasks" errors because the Row Level Security (RLS) policies in your Supabase database are not configured correctly.

## The Solution
Run the comprehensive SQL script I've created to fix all permission issues.

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `ovvihfhkhqigzahlttyf`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### 2. Copy and Run the SQL Script
Copy the entire contents of `scripts/fix-permissions-comprehensive.sql` and paste it into the SQL editor, then click "Run".

The script will:
- Add all missing columns to your tables
- Fix all RLS policies to allow both user access AND service role access
- Create proper indexes for performance
- Set up automatic profile creation
- Grant necessary permissions

### 3. Verify the Fix
After running the script, you should see:
- "Database permissions fix completed successfully"
- A list of all the policies that were created

### 4. Test Your App
Try creating a goal again. The permission errors should be gone.

## What the Script Does

The script fixes the core issue: your RLS policies were only allowing regular users, but the backend needs to use the service role key to bypass RLS for task creation.

The new policies allow access for:
- `auth.uid() = user_id` (regular users accessing their own data)
- `auth.jwt() ->> 'role' = 'service_role'` (backend operations using service role)

This ensures both your frontend and backend can properly access the database.

## If You Still Have Issues

If you still get permission errors after running the script:

1. Check that the script ran without errors
2. Make sure you're signed in to the app
3. Try signing out and back in
4. Check the browser console for any authentication errors

The app is now configured to use the service role key for backend operations, which should bypass all RLS restrictions for task creation.