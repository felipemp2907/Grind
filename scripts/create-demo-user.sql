-- Create demo user for Google authentication testing
-- Run this in your Supabase SQL Editor if Google auth demo fails

-- First, disable email confirmations temporarily (you can re-enable later)
-- Go to Authentication > Settings > Email confirmations = OFF

-- Create demo user in auth.users table (this requires admin privileges)
-- Note: This is for development/testing only
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'demo.user@gmail.com',
  crypt('DemoPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo Google User", "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c", "provider": "google"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Alternative: Create multiple demo users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'testuser@gmail.com',
  crypt('DemoPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User", "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c", "provider": "google"}',
  false,
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'google.demo@gmail.com',
  crypt('DemoPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Google Demo", "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c", "provider": "google"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Verify the users were created
SELECT id, email, email_confirmed_at, raw_user_meta_data->>'full_name' as name 
FROM auth.users 
WHERE email IN ('demo.user@gmail.com', 'testuser@gmail.com', 'google.demo@gmail.com');