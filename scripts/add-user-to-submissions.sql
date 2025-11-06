-- ============================================
-- ADD USER TRACKING TO SUBMISSIONS TABLE
-- ============================================
-- This script adds user authentication fields to the submissions table
-- so we can track which user submitted each card proposal.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================

-- Step 1: Add user_id column (foreign key to auth.users)
ALTER TABLE public.submissions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_name column (to cache the user's display name)
ALTER TABLE public.submissions
ADD COLUMN user_name TEXT;

-- Step 3: Create index for faster queries by user
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);

-- Step 4: Update RLS policies to allow users to see their own submissions
-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.submissions;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.submissions;

-- Create new RLS policies

-- 1. Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Authenticated users can create submissions (with their user_id)
CREATE POLICY "Authenticated users can create submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Admins can update submissions
CREATE POLICY "Admins can update submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON public.submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check the updated schema
\d public.submissions

-- Count existing submissions (should preserve all data)
SELECT COUNT(*) as total_submissions FROM public.submissions;

-- Check new columns
SELECT id, card_name, user_id, user_name, contact_email, status, created_at
FROM public.submissions
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- NOTES
-- ============================================
-- 1. user_id is nullable for now (existing submissions won't have it)
-- 2. New submissions MUST include user_id (enforced by RLS policy)
-- 3. user_name is cached for display purposes
-- 4. Users can only see their own submissions
-- 5. Admins can see and manage all submissions
--
-- OPTIONAL: Clean up old anonymous submissions
-- DELETE FROM public.submissions WHERE user_id IS NULL;
-- ============================================

