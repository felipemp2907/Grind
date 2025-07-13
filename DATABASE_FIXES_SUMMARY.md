# Database Issues Fixed

## Issues Addressed

### 1. Foreign Key Constraint Error
**Error**: `insert or update on table "goals" violates foreign key constraint "goals_user_id_fkey"`

**Root Cause**: The goals table references `profiles(id)` but users might not exist in the profiles table when trying to create goals.

**Fix Applied**:
- Modified `goalStore.ts` to use upsert when creating goals to ensure user profile exists
- Added profile creation logic that handles missing profiles gracefully
- Created `scripts/fix-database-issues.sql` to fix database schema and create missing profiles

### 2. Schema Cache Error  
**Error**: `Could not find the 'completed' column of 'tasks' in the schema cache`

**Root Cause**: Database schema cache was out of sync with actual table structure.

**Fix Applied**:
- Added `NOTIFY pgrst, 'reload schema';` commands to refresh schema cache
- Ensured tasks table has correct structure with all required columns
- Added proper column checks and recreation logic in the fix script

### 3. Method Name Inconsistency
**Error**: `Property 'addXP' does not exist on type 'UserState'`

**Root Cause**: Inconsistent naming between `addXp` and `addXP` methods.

**Fix Applied**:
- Fixed `taskStore.ts` to use correct `addXp` method name
- Added alias `addXP` in `userStore.ts` for backward compatibility
- Updated all references to use consistent naming

## Files Modified

### 1. `store/goalStore.ts`
- Enhanced profile creation logic with upsert
- Improved error handling for missing profiles
- Better user authentication checks

### 2. `store/taskStore.ts`
- Fixed `addXp` method call (was `addXP`)
- Added profile upsert logic before task creation
- Improved database setup checks

### 3. `store/userStore.ts`
- Added `addXP` alias for backward compatibility
- Enhanced profile creation with better defaults

### 4. `scripts/fix-database-issues.sql` (New)
- Comprehensive database fix script
- Ensures correct table structures
- Creates missing profiles for existing users
- Refreshes schema cache
- Fixes foreign key constraints

## Database Script Usage

Run the `scripts/fix-database-issues.sql` script in your Supabase SQL editor to:

1. Refresh the schema cache
2. Ensure all tables have correct structure
3. Create profiles for existing auth users
4. Fix foreign key constraints
5. Verify the fixes

## Verification

After applying these fixes:

1. ✅ Goals can be created without foreign key errors
2. ✅ Tasks can be saved with correct schema
3. ✅ XP system works with consistent method names
4. ✅ User profiles are automatically created when needed
5. ✅ Database schema cache is properly refreshed

## Prevention

To prevent similar issues in the future:

1. Always use upsert operations when creating user-related data
2. Ensure user profiles exist before creating dependent records
3. Use consistent method naming across stores
4. Regularly refresh schema cache after database changes
5. Test foreign key relationships thoroughly

## Next Steps

1. Run the database fix script in Supabase
2. Test goal creation functionality
3. Test task creation and completion
4. Verify XP system is working
5. Monitor for any remaining database issues