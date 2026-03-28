# URGENT: Database Permissions Fix Required

## The Problem
Your app is getting "permission denied for table goals/tasks" errors because the database schema and RLS policies are not properly configured.

## The Solution
Run the comprehensive database fix script that will:
1. Create all required tables and columns
2. Fix all RLS (Row Level Security) policies  
3. Grant proper permissions to authenticated users
4. Create necessary functions and triggers

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor" in the left sidebar

### 2. Run the Fix Script
1. Copy the entire contents of `scripts/fix-permissions-ultimate.sql`
2. Paste it into the SQL Editor
3. Click "Run" to execute the script

### 3. Verify the Fix
After running the script, you should see:
- "Ultimate permissions fix completed successfully!" message
- A list of all table columns showing the schema is complete
- A list of all RLS policies showing proper security is in place

## What This Fixes
- ✅ Creates missing database tables (profiles, goals, tasks, journal_entries)
- ✅ Adds all missing columns to existing tables
- ✅ Drops and recreates all RLS policies with proper permissions
- ✅ Grants necessary permissions to authenticated users
- ✅ Creates helper functions for user profile management
- ✅ Sets up proper triggers for automatic profile creation
- ✅ Creates performance indexes

## After Running the Script
Your app should immediately start working without any permission errors. You'll be able to:
- Create goals successfully
- Generate tasks automatically
- Access all features without permission issues

## If You Still Have Issues
If you continue to see permission errors after running this script, please share:
1. The exact error message
2. A screenshot of the SQL Editor showing the script was run successfully
3. Your Supabase project URL

The script is comprehensive and should resolve all database-related permission issues.