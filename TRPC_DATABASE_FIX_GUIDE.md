# tRPC & Database Schema Fix Guide

## Issues Fixed

### 1. Database Schema Issues
- **Problem**: The `goals` table was missing required columns (`category`, `target_value`, `unit`, `priority`, `color`, `cover_image`, `status`)
- **Error**: `Could not find the 'category' column of 'goals' in the schema cache`

### 2. tRPC Client Issues  
- **Problem**: tRPC client receiving HTML instead of JSON responses
- **Error**: `TRPCClientError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

## How to Apply the Fix

### Step 1: Update Database Schema

Run the comprehensive database fix script:

```sql
-- Execute this in your Supabase SQL editor or database client
\i scripts/fix-trpc-and-database-comprehensive.sql
```

Or manually execute the script content from `scripts/fix-trpc-and-database-comprehensive.sql`.

### Step 2: Verify Database Schema

After running the script, verify the goals table has all required columns:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'goals'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FOREIGN KEY)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `deadline` (TIMESTAMP WITH TIME ZONE)
- `category` (TEXT) ✅ **ADDED**
- `target_value` (INTEGER, DEFAULT 100) ✅ **ADDED**
- `unit` (TEXT, DEFAULT '') ✅ **ADDED**
- `priority` (TEXT, CHECK constraint, DEFAULT 'medium') ✅ **ADDED**
- `color` (TEXT) ✅ **ADDED**
- `cover_image` (TEXT) ✅ **ADDED**
- `status` (TEXT, CHECK constraint, DEFAULT 'active') ✅ **ADDED**
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### Step 3: Test tRPC Endpoints

Run the endpoint test script:

```bash
node scripts/test-trpc-endpoints.js
```

This will verify that:
- API server is running on port 3000
- tRPC endpoints are accessible
- Responses are valid JSON (not HTML)

### Step 4: Verify Goal Creation

Test goal creation in your app:

1. **Simple Goal Creation**:
   ```typescript
   const result = await trpcClient.goals.create.mutate({
     title: "Test Goal",
     description: "Test Description", 
     deadline: "2024-12-31",
     category: "fitness",
     priority: "high"
   });
   ```

2. **Ultimate Goal Creation** (with streak tasks):
   ```typescript
   const result = await trpcClient.goals.createUltimate.mutate({
     title: "Ultimate Test Goal",
     description: "Test Description",
     deadline: "2024-12-31", 
     category: "fitness",
     targetValue: 100,
     unit: "reps",
     priority: "high"
   });
   ```

## What Was Fixed

### Database Schema
- ✅ Added missing columns to `goals` table
- ✅ Added missing columns to `tasks` table for streak functionality
- ✅ Created proper indexes for performance
- ✅ Updated RLS policies to work with new columns
- ✅ Set default values for existing records

### tRPC Configuration
- ✅ Improved error handling in tRPC client
- ✅ Better logging for debugging connection issues
- ✅ Proper JSON-only responses from server
- ✅ Fallback handling for development mode

### Code Improvements
- ✅ Fixed import issues in goal store
- ✅ Proper error handling in tRPC procedures
- ✅ Consistent data types and validation

## Troubleshooting

### If you still get "category column not found" error:

1. **Check if the migration ran successfully**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'goals' AND column_name = 'category';
   ```

2. **Force schema cache refresh**:
   ```sql
   SELECT pg_notify('pgrst', 'reload schema');
   ```

3. **Restart your Supabase connection** in your app.

### If you still get HTML responses from tRPC:

1. **Verify your development server is running**:
   ```bash
   curl http://localhost:3000/api/
   ```
   Should return JSON, not HTML.

2. **Check the API route configuration** in `api/[[...route]].ts`.

3. **Verify the base URL** in your tRPC client configuration.

### If authentication fails in development:

The tRPC procedures now have fallback demo user support for development mode. Check the console logs for authentication status.

## Testing

After applying the fixes, test these scenarios:

1. ✅ Create a simple goal
2. ✅ Create an ultimate goal with streak tasks  
3. ✅ Verify goals appear in the database with all columns
4. ✅ Verify streak tasks are created properly
5. ✅ Test error handling (invalid data, network issues)

## Files Modified

- `scripts/fix-trpc-and-database-comprehensive.sql` - Database schema fix
- `scripts/test-trpc-endpoints.js` - Endpoint testing script
- `lib/trpc.ts` - Improved error handling
- `backend/trpc/create-context.ts` - Better auth handling
- `backend/trpc/routes/goals/create-ultimate-goal.ts` - Robust goal creation

The fixes ensure that both the database schema and tRPC client/server communication work reliably for goal creation functionality.