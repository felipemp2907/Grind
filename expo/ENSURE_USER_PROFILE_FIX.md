# Fix for ensure_user_profile Function Error

## Problem
The application was throwing the error:
```
ERROR Error ensuring profile exists: Could not find the function public.ensure_user_profile(user_id, user_name) in the schema cache
```

## Root Cause
The `ensure_user_profile` function was missing from the database schema. This function is called by the application in several places:

1. `store/authStore.ts` - During login and registration
2. `store/userStore.ts` - When updating user profiles
3. `lib/supabase.ts` - For profile creation and management

## Solution
Run the SQL script `scripts/fix-ensure-user-profile-function-final.sql` in your Supabase SQL Editor.

### What the script does:

1. **Drops existing functions** (if any) to ensure clean state
2. **Creates the main function** `ensure_user_profile(user_id UUID, user_name TEXT)`
   - Checks if user exists in `auth.users`
   - Creates or updates profile in `profiles` table
   - Returns `TRUE` on success, `FALSE` on failure
3. **Creates a simpler overload** `ensure_user_profile(user_id UUID)` for backward compatibility
4. **Grants proper permissions** to `authenticated` and `anon` roles
5. **Creates helper function** `check_user_exists(user_id UUID)` for user validation
6. **Tests the function** with existing users (if any)
7. **Refreshes schema cache** to make functions immediately available

### Function Signatures:
```sql
-- Main function
public.ensure_user_profile(user_id UUID, user_name TEXT DEFAULT 'User') RETURNS BOOLEAN

-- Simplified version
public.ensure_user_profile(user_id UUID) RETURNS BOOLEAN

-- Helper function
public.check_user_exists(user_id UUID) RETURNS BOOLEAN
```

## How to Apply the Fix

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `scripts/fix-ensure-user-profile-function-final.sql`
4. Run the script
5. Verify the functions were created successfully

## Verification
After running the script, you should see:
- No more "function not found" errors
- User profiles are properly created/updated during login and registration
- Profile updates work correctly

## Files Modified
- Created: `scripts/fix-ensure-user-profile-function-final.sql`
- Created: `ENSURE_USER_PROFILE_FIX.md`

The application code in `store/authStore.ts`, `store/userStore.ts`, and `lib/supabase.ts` already has proper fallback mechanisms, so no code changes are needed.