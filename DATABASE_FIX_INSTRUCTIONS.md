# URGENT: Fix Database Schema Issue

## Problem
Your app is failing because the `status` column is missing from the `tasks` table in your Supabase database.

## Solution
You need to run a SQL script in your Supabase dashboard to add the missing columns.

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Sign in to your account
- Select your project: `ovvihfhkhqigzahlttyf`

### 2. Open SQL Editor
- In the left sidebar, click on "SQL Editor"
- Click "New Query" to create a new SQL script

### 3. Copy and Run the Fix Script
- Copy the entire contents of the file: `scripts/fix-database-comprehensive-final.sql`
- Paste it into the SQL editor
- Click the "Run" button (or press Ctrl/Cmd + Enter)

### 4. Verify the Fix
- The script should complete without errors
- You should see a success message and a list of all columns in the tasks table
- Look for these columns in the output: `status`, `type`, `task_date`, `due_at`, `load_score`, `proof_mode`, `scheduled_for_date`

### 5. Test Your App
- Go back to your app
- Try creating a new goal
- The error should be resolved

## What This Script Does:
- Adds all missing columns to the `tasks` table
- Adds missing columns to `goals` and `profiles` tables
- Sets up proper database constraints and indexes
- Fixes Row Level Security (RLS) policies
- Creates triggers for automatic profile creation

## If You Still Get Errors:
1. Make sure you're signed in to the correct Supabase project
2. Check that the script ran completely without errors
3. Try refreshing your app after running the script
4. If problems persist, check the browser console for specific error messages

The script is safe to run multiple times - it uses `IF NOT EXISTS` clauses to prevent duplicate columns.