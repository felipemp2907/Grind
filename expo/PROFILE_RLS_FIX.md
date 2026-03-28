# Profile RLS Policy Fix

## Issue
The app was experiencing "new row violates row-level security policy for table 'profiles'" errors when users tried to save their profiles. This happens because the Row Level Security (RLS) policies weren't properly configured to handle profile creation and updates.

## Root Cause
1. The RLS policies required `auth.uid()` to match the profile ID, but there were timing issues with authentication context
2. The profile creation process wasn't using the proper security-definer functions
3. Missing proper error handling for profile creation edge cases

## Solution Applied

### 1. Updated Database Schema (`database-setup.sql`)
- Added improved `ensure_user_profile()` RPC function with SECURITY DEFINER
- Enhanced `handle_new_user()` trigger function with better error handling
- Both functions now use `ON CONFLICT DO UPDATE` for safer upserts

### 2. Updated Application Code
- Modified `store/userStore.ts` to use the new RPC function
- Updated `app/profile/edit.tsx` to use the store's updateProfile method
- Enhanced `lib/supabase.ts` with better profile creation logic

### 3. Created Fix Script
- `scripts/fix-profile-rls-policy.sql` - Run this to apply the fixes to existing databases

## How to Apply the Fix

### Step 1: Update Database
Run the following SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/fix-profile-rls-policy.sql
-- OR run the complete database-setup.sql script again
```

### Step 2: Verify the Fix
The fix includes automatic testing that will run when you execute the SQL script. Look for these messages:
- "Profile RLS policy fix completed successfully!"
- "ensure_user_profile function test: SUCCESS"

## What the Fix Does

### 1. RPC Function: `ensure_user_profile(user_id, user_name)`
- Safely creates or updates user profiles
- Runs with SECURITY DEFINER privileges to bypass RLS during creation
- Returns boolean indicating success/failure
- Handles edge cases and errors gracefully

### 2. Improved Trigger: `handle_new_user()`
- Automatically creates profiles when users sign up
- Uses better fallback logic for user names
- Won't fail user creation if profile creation fails

### 3. Application Integration
- The app now uses the RPC function for all profile operations
- Fallback to direct upsert if RPC fails
- Better error messages and handling

## Testing the Fix

1. Try editing your profile name in the app
2. Try uploading a profile picture
3. Create a new user account
4. Check that profiles are created automatically

## Expected Behavior After Fix

- ✅ Profile editing should work without RLS errors
- ✅ New user signup should automatically create profiles
- ✅ Profile pictures should upload and save correctly
- ✅ Better error messages if something goes wrong
- ✅ Graceful fallbacks if RPC functions fail

## Rollback Plan

If issues occur, you can rollback by:
1. Running the original `database-setup.sql` script
2. The functions are designed to be safe and won't break existing data

## Files Modified

- `database-setup.sql` - Added new RPC functions
- `scripts/fix-profile-rls-policy.sql` - Standalone fix script
- `store/userStore.ts` - Enhanced profile update logic
- `app/profile/edit.tsx` - Simplified to use store methods
- `lib/supabase.ts` - Better profile creation helpers

The fix maintains backward compatibility and includes comprehensive error handling to prevent future issues.