-- Fix Demo User Profile for Development
-- This script ensures the demo user profile exists to fix foreign key constraints

BEGIN;

-- First, check if the demo user exists in auth.users
DO $$
DECLARE
    demo_user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = 'demo-user-id') INTO demo_user_exists;
    
    IF NOT demo_user_exists THEN
        -- Insert demo user into auth.users if it doesn't exist
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            'demo-user-id',
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'demo@example.com',
            '$2a$10$demo.encrypted.password.hash',
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Demo User", "email": "demo@example.com"}',
            false,
            '',
            '',
            '',
            ''
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Demo user created in auth.users';
    ELSE
        RAISE NOTICE 'Demo user already exists in auth.users';
    END IF;
END $$;

-- Now ensure the profile exists
INSERT INTO public.profiles (
    id,
    name,
    level,
    xp,
    streak_days,
    longest_streak,
    created_at,
    updated_at
) VALUES (
    'demo-user-id',
    'Demo User',
    1,
    0,
    0,
    0,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();

-- Verify the profile was created
SELECT 'Demo user profile verification:' as status;
SELECT id, name, level, xp FROM public.profiles WHERE id = 'demo-user-id';

-- Test goal creation with demo user
INSERT INTO public.goals (
    user_id,
    title,
    description,
    deadline,
    status
) VALUES (
    'demo-user-id',
    'Test Goal Creation',
    'Testing that goals can be created with demo user',
    NOW() + INTERVAL '30 days',
    'active'
) ON CONFLICT DO NOTHING;

SELECT 'Test goal creation successful!' as test_result;

-- Clean up test goal
DELETE FROM public.goals WHERE title = 'Test Goal Creation' AND user_id = 'demo-user-id';

COMMIT;

SELECT 'Demo user profile setup completed successfully!' as final_status;