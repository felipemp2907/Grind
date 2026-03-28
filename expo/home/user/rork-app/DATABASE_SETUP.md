# Database Setup Instructions

## Quick Setup Guide

If you're seeing a "Database not set up" error, follow these simple steps:

### 1. Copy the SQL Script
- Open the `database-setup.sql` file in your project
- Copy the ENTIRE contents of the file (Ctrl+A, then Ctrl+C)

### 2. Open Supabase Dashboard
- Go to [supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project
- Click on "SQL Editor" in the left sidebar

### 3. Run the Script
- Paste the entire SQL script into the SQL Editor
- Click the "Run" button
- Wait for all queries to complete successfully

### 4. Verify Setup
- Return to your app
- Click "Check Setup" button
- You should see a success message

**Optional: Run Test Script**
- Copy and run the `scripts/test-database.sql` script in Supabase SQL Editor
- This will verify all tables, policies, and functions are created correctly

## What This Creates

The setup script creates:
- **User profiles table** - Stores user information, XP, levels, streaks
- **Goals table** - Stores user's ultimate goals and milestones
- **Tasks table** - Stores daily tasks and habits
- **Journal entries table** - Stores journal entries and mood tracking
- **Row Level Security policies** - Ensures users can only access their own data
- **Storage bucket** - For profile pictures and file uploads
- **Triggers and functions** - For automatic profile creation and data updates

## Troubleshooting

### "Permission denied" errors
- Make sure you're logged into the correct Supabase project
- Ensure you have admin access to the project
- Check that you're using the correct project URL and API key

### "Function does not exist" errors
- Make sure you copied and ran the COMPLETE SQL script
- Try running the script again
- Check for any error messages in the SQL Editor

### "Table does not exist" errors
- The database setup script hasn't been run yet
- Copy and paste the ENTIRE `database-setup.sql` file into Supabase SQL Editor
- Click "Run" and wait for all queries to complete

### App still shows "Database not set up"
- Wait a few seconds and try clicking "Check Setup" again
- Refresh the app
- Run the test script (`scripts/test-database.sql`) to verify setup

### Still having issues?
- Check the Supabase logs in your dashboard
- Ensure your project is not paused
- Verify your Supabase URL and API key are correct
- Contact support if the issue persists

## Security Note

All data is protected by Row Level Security (RLS) policies, which means:
- Users can only see and modify their own data
- No user can access another user's information
- All database operations are secure by default