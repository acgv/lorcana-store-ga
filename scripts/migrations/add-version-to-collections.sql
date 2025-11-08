-- ============================================
-- ADD VERSION COLUMN TO EXISTING user_collections TABLE
-- ============================================
-- This script adds the 'version' column to an existing
-- user_collections table.
--
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add version column (if it doesn't exist)
ALTER TABLE public.user_collections
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'normal' CHECK (version IN ('normal', 'foil'));

-- Step 2: Update existing records to have 'normal' as default
UPDATE public.user_collections
SET version = 'normal'
WHERE version IS NULL;

-- Step 3: Make version NOT NULL
ALTER TABLE public.user_collections
ALTER COLUMN version SET NOT NULL;

-- Step 4: Drop old unique constraint (if exists)
DROP INDEX IF EXISTS idx_user_collections_unique;

-- Step 5: Create new unique constraint with version
CREATE UNIQUE INDEX idx_user_collections_unique 
  ON public.user_collections(user_id, card_id, status, version);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_collections'
ORDER BY ordinal_position;

-- Check existing data
SELECT 
  id,
  card_id,
  status,
  version,
  quantity
FROM public.user_collections
LIMIT 5;

-- ============================================
-- SUCCESS
-- ============================================
-- If you see the 'version' column in the results above,
-- the migration was successful!
-- 
-- You can now use the collection system with version tracking.
-- ============================================

