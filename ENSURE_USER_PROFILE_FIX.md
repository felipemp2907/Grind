# Fix for ensure_user_profile Function Not Found Error

## Problem
The error "Could not find the function public.ensure_user_profile(user_id, user_name) in the schema cache" occurs when the Supabase database function is not properly created or the schema cache is not refreshed.

## Solution Applied

### 1. Database Function Fix
Created `scripts/fix-ensure-user-profile-function.sql` that:
- Drops any existing versions of the function
- Creates the `ensure_user_profile` function with proper SECURITY DEFINER
- Grants execute permissions to authenticated and anonymous users
- Creates a backward-compatible version with just user_id parameter
- Refreshes the schema cache with `NOTIFY pgrst, 'reload schema'`
- Tests the function with existing users

### 2. Code Improvements
Updated `lib/supabase.ts` to:
- Detect function not found errors specifically
- Provide better error messages when the function is missing
- Always fall back to direct upsert when RPC fails
- Handle both `createUserProfile` and `ensureUserProfile` functions

### 3. Error Handling
The code now:
- Checks for specific error messages related to function not found
- Logs appropriate messages for debugging
- Falls back gracefully to direct database operations
- Provides helpful error messages to users

## How to Apply the Fix

### Step 1: Run the Database Script
1. Open your Supabase SQL Editor
2. Copy and paste the entire content of `scripts/fix-ensure-user-profile-function.sql`
3. Click "Run" to execute the script
4. Verify you see "ensure_user_profile function fix completed!" message

### Step 2: Verify Function Exists
The script will show you if the function was created successfully and test it with existing users.

### Step 3: Test the App
After running the script, the app should:
- No longer show the "Could not find the function" error
- Successfully create user profiles during signup
- Handle profile creation gracefully even if the function fails

## What the Function Does
The `ensure_user_profile` function:
- Checks if the user exists in `auth.users`
- Creates or updates a profile in the `profiles` table
- Returns `TRUE` if successful, `FALSE` if the user doesn't exist
- Uses `SECURITY DEFINER` to run with elevated privileges
- Handles conflicts by updating the existing profile

## Fallback Behavior
If the function still doesn't work, the code will:
- Use direct `upsert` operations on the `profiles` table
- Log appropriate error messages
- Continue to function normally
- Provide helpful error messages to guide further troubleshooting

## Prevention
To prevent this issue in the future:
- Always run the complete `database-setup.sql` script when setting up new environments
- Ensure the schema cache is refreshed after making database changes
- Monitor logs for RPC function errors