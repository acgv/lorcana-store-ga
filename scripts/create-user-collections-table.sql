-- ============================================
-- CREATE USER COLLECTIONS TABLE
-- ============================================
-- This table allows users to track their personal card collection
-- and wishlist (cards they own vs cards they want)
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================

-- Create the user_collections table
CREATE TABLE IF NOT EXISTS public.user_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('owned', 'wanted')),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id 
  ON public.user_collections(user_id);

CREATE INDEX IF NOT EXISTS idx_user_collections_card_id 
  ON public.user_collections(card_id);

CREATE INDEX IF NOT EXISTS idx_user_collections_status 
  ON public.user_collections(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_user_collections_user_card 
  ON public.user_collections(user_id, card_id);

-- Create unique constraint: one entry per user+card+status
-- (User can have same card as both 'owned' AND 'wanted')
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collections_unique 
  ON public.user_collections(user_id, card_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Users can view their own collection
CREATE POLICY "Users can view own collection"
ON public.user_collections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy 2: Users can insert into their own collection
CREATE POLICY "Users can add to own collection"
ON public.user_collections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy 3: Users can update their own collection
CREATE POLICY "Users can update own collection"
ON public.user_collections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy 4: Users can delete from their own collection
CREATE POLICY "Users can delete from own collection"
ON public.user_collections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_collections_updated_at
  BEFORE UPDATE ON public.user_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_collections'
ORDER BY ordinal_position;

-- Count collections (should be 0 initially)
SELECT COUNT(*) as total_collections FROM public.user_collections;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_collections';

-- ============================================
-- EXAMPLE USAGE (for testing)
-- ============================================

-- Add a card to "owned" collection:
-- INSERT INTO public.user_collections (user_id, card_id, status, quantity)
-- VALUES ('YOUR_USER_ID', 'tfc-001', 'owned', 2);

-- Add a card to "wanted" wishlist:
-- INSERT INTO public.user_collections (user_id, card_id, status)
-- VALUES ('YOUR_USER_ID', 'tfc-002', 'wanted');

-- View your collection:
-- SELECT * FROM public.user_collections WHERE user_id = auth.uid();

-- ============================================
-- NOTES
-- ============================================
-- 1. status: 'owned' = User owns this card
-- 2. status: 'wanted' = User wants this card
-- 3. User can have same card in both states (own 1, want more)
-- 4. quantity: Default 1, user can specify how many they own
-- 5. notes: Optional field for user notes (condition, language, etc.)
-- 6. RLS policies ensure users only see/modify their own data
-- 7. updated_at auto-updates on any change
-- ============================================

