# tRPC JSON Parse Error Fix

## Problem
The app was experiencing `TRPCClientError: JSON Parse error: Unexpected character: <` when trying to create goals or generate tasks. This error occurs when the tRPC client receives HTML instead of JSON, typically indicating API routing issues.

## Root Causes Identified
1. **tRPC Client Configuration**: The transformer was incorrectly placed at the client level instead of the httpBatchLink level
2. **Database Schema Issues**: Missing columns in the goals table (category, target_value, etc.) causing Supabase errors
3. **API Route Configuration**: Potential issues with the API route handling

## Fixes Applied

### 1. Fixed tRPC Client Configuration (`lib/trpc.ts`)
- Moved `transformer: superjson` from client level to `httpBatchLink` level
- Improved base URL detection with better logging
- Enhanced error handling to provide clearer error messages

### 2. Simplified tRPC Procedures (`backend/trpc/routes/goals/create-ultimate-goal.ts`)
- Removed optional column insertions that were causing schema cache issues
- Simplified goal creation to use only guaranteed columns (id, user_id, title, description, deadline)
- Maintained proper error handling with TRPCError

### 3. Enhanced Backend Logging (`backend/hono.ts`)
- Added test endpoints for debugging tRPC connectivity
- Improved error handling to always return JSON (never HTML)
- Added comprehensive CORS configuration

### 4. Database Schema Fix (`scripts/fix-database-final-comprehensive.sql`)
- Created comprehensive script to add all missing columns
- Includes proper error handling and column existence checks
- Forces schema cache refresh to ensure Supabase recognizes new columns
- Includes test insertion to verify schema works

### 5. Health Check Component (`components/TRPCHealthCheck.tsx`)
- Created test component to verify tRPC connectivity
- Includes tests for both basic connection and goal creation
- Provides clear success/error feedback

## Instructions to Apply the Fix

### Step 1: Run Database Migration
1. Open your Supabase SQL Editor
2. Copy and paste the entire contents of `scripts/fix-database-final-comprehensive.sql`
3. Click "Run" to execute the script
4. Verify that all columns are added successfully

### Step 2: Test the Fix
1. Add the TRPCHealthCheck component to your app temporarily:
```tsx
import { TRPCHealthCheck } from '@/components/TRPCHealthCheck';

// Add this to any screen for testing
<TRPCHealthCheck />
```

2. Test both the "Test tRPC Connection" and "Test Goal Creation" buttons
3. Check the console logs for detailed debugging information

### Step 3: Verify Goal Creation
1. Try creating a new goal through the normal app flow
2. Try creating an ultimate goal
3. Try generating daily tasks

## Expected Results
- ✅ No more "JSON Parse error: Unexpected character: <" errors
- ✅ Goal creation works without database schema errors
- ✅ tRPC endpoints return proper JSON responses
- ✅ Enhanced error messages for easier debugging

## Debugging Tips
If issues persist:

1. **Check Console Logs**: Look for the base URL being used and any fetch errors
2. **Test API Endpoints Directly**: Visit `/api/` and `/api/test-trpc-direct` in your browser
3. **Verify Database Schema**: Run the schema check queries in the SQL script
4. **Check Network Tab**: Look for 404 or 500 responses instead of 200

## Technical Details

### tRPC v11 Configuration
The key fix was moving the transformer to the correct location:
```typescript
// ❌ Wrong (old way)
export const trpcClient = createTRPCClient<AppRouter>({
  transformer: superjson, // Wrong location
  links: [httpBatchLink({ url: '...' })]
});

// ✅ Correct (new way)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '...',
      transformer: superjson, // Correct location
    })
  ]
});
```

### Database Schema
The goals table now includes all required columns:
- `category` (TEXT)
- `target_value` (INTEGER, default 100)
- `unit` (TEXT, default '')
- `priority` (TEXT with CHECK constraint)
- `color` (TEXT)
- `cover_image` (TEXT)
- `status` (TEXT with CHECK constraint, default 'active')

This fix should resolve all tRPC JSON parse errors and enable proper goal creation functionality.