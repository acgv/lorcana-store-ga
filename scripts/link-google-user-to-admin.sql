-- ============================================
-- LINK GOOGLE OAUTH USER TO ADMIN ROLE
-- ============================================
-- This script links a Google OAuth user to the admin role
-- in the user_roles table.
--
-- Run this in Supabase SQL Editor AFTER logging in with Google
-- ============================================

-- Step 1: Find your user ID (after logging in with Google)
-- Replace 'YOUR_EMAIL@gmail.com' with your actual email
SELECT 
  id as user_id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'acgv.24.10@gmail.com'; -- ⭐ CHANGE THIS TO YOUR EMAIL

-- Step 2: Insert admin role for your Google user
-- Copy the user_id from Step 1 and paste below
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'acgv.24.10@gmail.com'), -- ⭐ CHANGE THIS
  'admin',
  NOW()
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify the admin role was added
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'acgv.24.10@gmail.com'; -- ⭐ CHANGE THIS

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- You should see:
-- user_id              | email                    | role  | created_at
-- ---------------------|--------------------------|-------|------------
-- uuid-here...         | acgv.24.10@gmail.com     | admin | 2025-...

-- ============================================
-- NEXT STEPS
-- ============================================
-- 1. Refresh your browser
-- 2. You should now see "Admin Panel" in your user menu
-- 3. Click it to access the admin panel
-- ============================================

