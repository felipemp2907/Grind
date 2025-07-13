# Database Setup Guide

This guide will help you set up the Supabase database for the Grind app.

## Prerequisites

1. A Supabase project created at [supabase.com](https://supabase.com)
2. Access to the Supabase SQL Editor in your project dashboard

## Setup Steps

### 1. Run the Main Setup Script

1. Open your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy the entire contents of `database-setup.sql` from this project
5. Paste it into the SQL Editor
6. Click **"Run"** to execute the script

The script will:
- Create all necessary tables (profiles, goals, tasks, milestones, journal_entries)
- Set up Row Level Security (RLS) policies
- Create database functions and triggers
- Set up proper foreign key relationships
- Create storage buckets for profile pictures

### 2. Verify the Setup (Recommended)

To verify everything was set up correctly:

1. In the SQL Editor, create another new query
2. Copy the contents of `scripts/diagnose-database.sql`
3. Paste and run it
4. Check the results - any ✗ marks indicate issues that need fixing

If you see any problems, run the appropriate fix scripts mentioned in the results.

### 3. Update Your Environment

Make sure your `.env.local` file has the correct Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Foreign Key Constraint Errors

If you see errors like "violates foreign key constraint", it means:
- The database setup script wasn't run completely
- There are existing tables with old schema that need to be dropped
- The user profile wasn't created properly

**Solution**: Re-run the complete `database-setup.sql` script. It will drop and recreate all tables with the correct relationships.

### "Table does not exist" or "Column not found" Errors

This means the database setup script wasn't run or failed partway through, or there's a schema mismatch.

**Solution**: 
1. Run the complete `database-setup.sql` script in your Supabase SQL Editor
2. If you still get column errors (like "Could not find the 'completed' column"), run the comprehensive fix script: `scripts/verify-and-fix-schema.sql`
3. This will check all tables and add any missing columns without losing existing data

### "Could not find the 'completed' column" Error

This specific error occurs when the tasks table exists but is missing required columns. This can happen if:
- The database was partially set up
- An older version of the schema was used
- The schema cache needs to be refreshed

**Solution**: 
1. Run `scripts/verify-and-fix-schema.sql` in your Supabase SQL Editor
2. This script will add any missing columns to existing tables
3. It will also refresh the schema cache

### RLS Policy Errors

If you get permission denied errors, it means Row Level Security policies aren't set up correctly.

**Solution**: The `database-setup.sql` script includes all necessary RLS policies. Make sure to run the complete script.

## Database Schema Overview

### Tables Created

1. **profiles** - User profile information (linked to auth.users)
2. **goals** - User goals and objectives
3. **tasks** - Daily tasks and habits
4. **milestones** - Goal milestones and progress markers
5. **journal_entries** - User journal entries and reflections

### Key Relationships

- `profiles.id` → `auth.users.id` (one-to-one)
- `goals.user_id` → `profiles.id` (one-to-many)
- `tasks.user_id` → `profiles.id` (one-to-many)
- `tasks.goal_id` → `goals.id` (many-to-one)
- `milestones.goal_id` → `goals.id` (many-to-one)
- `journal_entries.user_id` → `profiles.id` (one-to-many)

## Need Help?

If you encounter issues:

1. Check the Supabase logs in your project dashboard
2. Verify your environment variables are correct
3. Make sure you ran the complete database setup script
4. Try running the test script to identify specific issues

The app will show a "Database Setup Required" message if the database isn't properly configured.