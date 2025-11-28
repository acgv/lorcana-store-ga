-- ============================================
-- CREATE USER PROFILE TABLES
-- ============================================
-- This script creates all tables needed for user profiles:
-- 1. user_profiles - Basic personal information
-- 2. user_addresses - Shipping addresses (max 5 per user)
-- 3. user_phones - Phone numbers (max 5 per user)
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  document_type TEXT CHECK (document_type IN ('RUT', 'Pasaporte', 'Cédula', 'Otro')),
  document_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
ON public.user_profiles FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. USER ADDRESSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  commune TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  postal_code TEXT,
  additional_info TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id 
  ON public.user_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default 
  ON public.user_addresses(user_id, is_default) WHERE is_default = true;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
CREATE POLICY "Users can view own addresses"
ON public.user_addresses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert own addresses"
ON public.user_addresses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses"
ON public.user_addresses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete own addresses"
ON public.user_addresses FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON public.user_addresses;
CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON public.user_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- ============================================
-- 3. USER PHONES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'mobile' CHECK (phone_type IN ('mobile', 'home', 'work', 'other')),
  country_code TEXT DEFAULT '+56',
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_phones_user_id 
  ON public.user_phones(user_id);

CREATE INDEX IF NOT EXISTS idx_user_phones_is_default 
  ON public.user_phones(user_id, is_default) WHERE is_default = true;

ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own phones" ON public.user_phones;
CREATE POLICY "Users can view own phones"
ON public.user_phones FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own phones" ON public.user_phones;
CREATE POLICY "Users can insert own phones"
ON public.user_phones FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own phones" ON public.user_phones;
CREATE POLICY "Users can update own phones"
ON public.user_phones FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own phones" ON public.user_phones;
CREATE POLICY "Users can delete own phones"
ON public.user_phones FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_phones_updated_at ON public.user_phones;
CREATE TRIGGER update_user_phones_updated_at
  BEFORE UPDATE ON public.user_phones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default phone per user
CREATE OR REPLACE FUNCTION ensure_single_default_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_phones
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_phone_trigger ON public.user_phones;
CREATE TRIGGER ensure_single_default_phone_trigger
  BEFORE INSERT OR UPDATE ON public.user_phones
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_phone();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'user_profiles'
UNION ALL
SELECT 
  'user_addresses' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'user_addresses'
UNION ALL
SELECT 
  'user_phones' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'user_phones';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_profiles', 'user_addresses', 'user_phones')
ORDER BY tablename;

-- ============================================
-- NOTES
-- ============================================
-- 1. user_profiles: One profile per user (1:1 relationship)
-- 2. user_addresses: Maximum 5 addresses per user (enforced by app)
-- 3. user_phones: Maximum 5 phones per user (enforced by app)
-- 4. Only one default address and one default phone per user (enforced by triggers)
-- 5. All tables have RLS enabled with policies for user isolation
-- 6. All tables auto-update updated_at on changes
-- 7. CASCADE delete: When user is deleted, all related data is deleted
-- ============================================

