# Foreign Key Constraint Fix

## Problem
The app was experiencing foreign key constraint errors when creating goals:
```
Error saving goal to Supabase: insert or update on table "goals" violates foreign key constraint "goals_user_id_fkey"
```

This error occurs because the `goals` table references `public.profiles(id)`, but sometimes users exist in `auth.users` without corresponding entries in `public.profiles`.

## Root Cause
1. The database trigger `handle_new_user()` should create a profile when a user signs up
2. However, there can be timing issues or failures that prevent profile creation
3. When a goal is created, it references a `user_id` that doesn't exist in the `profiles` table

## Solution

### 1. Database Fixes
Run the SQL script `scripts/fix-foreign-key-constraints.sql` in your Supabase SQL Editor. This script:

- Identifies orphaned goals and missing profiles
- Creates profiles for any auth users that don't have them
- Cleans up orphaned goals
- Improves the `handle_new_user()` trigger function
- Adds a new `ensure_user_profile()` RPC function

### 2. Application Code Fixes

#### Enhanced Profile Creation (`lib/supabase.ts`)
- Improved `ensureUserProfile()` function with better error handling
- Enhanced `getCurrentUser()` function with session validation
- Updated `createUserProfile()` to use RPC function as primary method

#### Goal Store Improvements (`store/goalStore.ts`)
- Added retry logic for profile creation
- Better error handling and user feedback
- Profile verification before goal insertion
- More descriptive error messages

#### Auth Store Updates (`store/authStore.ts`)
- Ensures profile creation during both registration and login
- Uses RPC function as fallback if direct profile creation fails
- Better error handling throughout the auth flow

### 3. Key Improvements

1. **Robust Profile Creation**: Multiple fallback mechanisms ensure profiles are created
2. **Better Error Handling**: Clear error messages help identify issues
3. **Retry Logic**: Automatic retries for transient failures
4. **Verification Steps**: Profile existence is verified before operations
5. **RPC Function**: Server-side function handles profile creation with better error handling

## How to Apply the Fix

1. **Run the SQL Script**:
   - Copy the entire content of `scripts/fix-foreign-key-constraints.sql`
   - Paste it into your Supabase SQL Editor
   - Click "Run" to execute all commands

2. **Restart Your App**:
   - The code changes are already applied
   - Restart your development server to ensure all changes are loaded

3. **Test the Fix**:
   - Try creating a new goal
   - The error should no longer occur
   - Check the console logs for confirmation messages

## Verification

After applying the fix, you can verify it worked by:

1. **Check Database Consistency**:
   ```sql
   -- This should return 0 rows
   SELECT g.id, g.user_id, g.title 
   FROM public.goals g
   LEFT JOIN public.profiles p ON g.user_id = p.id
   WHERE p.id IS NULL;
   ```

2. **Test Goal Creation**:
   - Create a new goal in the app
   - It should succeed without foreign key errors

3. **Check Logs**:
   - Look for "Profile verified, inserting goal..." in console
   - Should see "Goal saved successfully" messages

## Prevention

The fix includes several prevention mechanisms:

1. **Database Trigger**: Automatically creates profiles for new users
2. **RPC Function**: Server-side profile creation with error handling
3. **Application Checks**: Profile verification before operations
4. **Retry Logic**: Handles transient failures gracefully

This comprehensive approach ensures the foreign key constraint error won't occur again.