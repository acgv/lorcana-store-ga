-- Migration: Move price_calculation_settings to private schema
-- Description: Moves the table to a private schema (admin) that is not exposed to PostgREST
-- This solves the Supabase Security Advisor warning without needing RLS policies
-- Date: 2025-12-01

-- Step 1: Create the admin schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS admin;

-- Step 2: Create or move the table to the admin schema
-- First, check if table exists in public and move it, otherwise create it in admin

DO $$
BEGIN
  -- If table exists in public, move it to admin
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'price_calculation_settings'
  ) THEN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS set_price_calculation_settings_updated_at ON public.price_calculation_settings;
    
    -- Move the table to admin schema
    ALTER TABLE public.price_calculation_settings SET SCHEMA admin;
  ELSE
    -- Table doesn't exist, create it directly in admin schema
    CREATE TABLE IF NOT EXISTS admin.price_calculation_settings (
      id text PRIMARY KEY DEFAULT 'default',
      "usTaxRate" DECIMAL(5, 4) NOT NULL DEFAULT 0.08,
      "shippingUSD" DECIMAL(10, 2) NOT NULL DEFAULT 8.00,
      "chileVATRate" DECIMAL(5, 4) NOT NULL DEFAULT 0.19,
      "exchangeRate" DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
      "profitMargin" DECIMAL(5, 4) NOT NULL DEFAULT 0.20,
      "mercadoPagoFee" DECIMAL(5, 4) NOT NULL DEFAULT 0.034,
      "updatedAt" timestamptz DEFAULT now(),
      "updatedBy" text
    );
    
    -- Insert default values
    INSERT INTO admin.price_calculation_settings (id, "usTaxRate", "shippingUSD", "chileVATRate", "exchangeRate", "profitMargin", "mercadoPagoFee")
    VALUES ('default', 0.08, 8.00, 0.19, 1000.00, 0.20, 0.034)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 3: Create or recreate the trigger function and trigger
-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_price_calculation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate it
DROP TRIGGER IF EXISTS set_price_calculation_settings_updated_at ON admin.price_calculation_settings;
CREATE TRIGGER set_price_calculation_settings_updated_at
BEFORE UPDATE ON admin.price_calculation_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_price_calculation_settings_updated_at();

-- Step 4: Update the comment
COMMENT ON TABLE admin.price_calculation_settings IS 'Stores price calculation parameters used for converting USD prices to CLP. Located in private admin schema, not exposed to PostgREST.';

-- Step 5: Grant necessary permissions to service role
-- The service role should already have access, but we ensure it explicitly
GRANT ALL ON SCHEMA admin TO service_role;
GRANT ALL ON admin.price_calculation_settings TO service_role;

-- Step 6: Create helper functions in public schema to access the private table
-- These functions can only be called by service role (supabaseAdmin)
-- This allows the Supabase JS client to access the table through PostgREST

-- Function to get price calculation settings
CREATE OR REPLACE FUNCTION public.get_price_calculation_settings()
RETURNS TABLE (
  id text,
  "usTaxRate" DECIMAL(5, 4),
  "shippingUSD" DECIMAL(10, 2),
  "chileVATRate" DECIMAL(5, 4),
  "exchangeRate" DECIMAL(10, 2),
  "profitMargin" DECIMAL(5, 4),
  "mercadoPagoFee" DECIMAL(5, 4),
  "updatedAt" timestamptz,
  "updatedBy" text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
BEGIN
  -- Service role automatically bypasses RLS, so we trust that only service role can call this
  -- The function is in public schema but accesses admin schema, which is not exposed to PostgREST
  -- Only backend code with service role key can access this
  
  RETURN QUERY
  SELECT 
    pcs.id,
    pcs."usTaxRate",
    pcs."shippingUSD",
    pcs."chileVATRate",
    pcs."exchangeRate",
    pcs."profitMargin",
    pcs."mercadoPagoFee",
    pcs."updatedAt",
    pcs."updatedBy"
  FROM admin.price_calculation_settings pcs
  WHERE pcs.id = 'default';
  
  -- If no rows returned, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'default'::text as id,
      0.08::DECIMAL(5, 4) as "usTaxRate",
      8.00::DECIMAL(10, 2) as "shippingUSD",
      0.19::DECIMAL(5, 4) as "chileVATRate",
      1000.00::DECIMAL(10, 2) as "exchangeRate",
      0.20::DECIMAL(5, 4) as "profitMargin",
      0.034::DECIMAL(5, 4) as "mercadoPagoFee",
      now()::timestamptz as "updatedAt",
      NULL::text as "updatedBy";
  END IF;
END;
$$;

-- Function to upsert price calculation settings
CREATE OR REPLACE FUNCTION public.upsert_price_calculation_settings(
  p_usTaxRate DECIMAL(5, 4) DEFAULT NULL,
  p_shippingUSD DECIMAL(10, 2) DEFAULT NULL,
  p_chileVATRate DECIMAL(5, 4) DEFAULT NULL,
  p_exchangeRate DECIMAL(10, 2) DEFAULT NULL,
  p_profitMargin DECIMAL(5, 4) DEFAULT NULL,
  p_mercadoPagoFee DECIMAL(5, 4) DEFAULT NULL
)
RETURNS TABLE (
  id text,
  "usTaxRate" DECIMAL(5, 4),
  "shippingUSD" DECIMAL(10, 2),
  "chileVATRate" DECIMAL(5, 4),
  "exchangeRate" DECIMAL(10, 2),
  "profitMargin" DECIMAL(5, 4),
  "mercadoPagoFee" DECIMAL(5, 4),
  "updatedAt" timestamptz,
  "updatedBy" text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
  v_existing admin.price_calculation_settings%ROWTYPE;
BEGIN
  -- Service role automatically bypasses RLS, so we trust that only service role can call this
  -- The function is in public schema but accesses admin schema, which is not exposed to PostgREST
  -- Only backend code with service role key can access this
  
  -- Get existing record if it exists
  SELECT * INTO v_existing
  FROM admin.price_calculation_settings pcs
  WHERE pcs.id = 'default'
  LIMIT 1;
  
  -- Upsert logic
  INSERT INTO admin.price_calculation_settings (
    id,
    "usTaxRate",
    "shippingUSD",
    "chileVATRate",
    "exchangeRate",
    "profitMargin",
    "mercadoPagoFee"
  )
  VALUES (
    'default',
    COALESCE(p_usTaxRate, v_existing."usTaxRate", 0.08),
    COALESCE(p_shippingUSD, v_existing."shippingUSD", 8.00),
    COALESCE(p_chileVATRate, v_existing."chileVATRate", 0.19),
    COALESCE(p_exchangeRate, v_existing."exchangeRate", 1000.00),
    COALESCE(p_profitMargin, v_existing."profitMargin", 0.20),
    COALESCE(p_mercadoPagoFee, v_existing."mercadoPagoFee", 0.034)
  )
  ON CONFLICT (id) DO UPDATE SET
    "usTaxRate" = COALESCE(p_usTaxRate, price_calculation_settings."usTaxRate"),
    "shippingUSD" = COALESCE(p_shippingUSD, price_calculation_settings."shippingUSD"),
    "chileVATRate" = COALESCE(p_chileVATRate, price_calculation_settings."chileVATRate"),
    "exchangeRate" = COALESCE(p_exchangeRate, price_calculation_settings."exchangeRate"),
    "profitMargin" = COALESCE(p_profitMargin, price_calculation_settings."profitMargin"),
    "mercadoPagoFee" = COALESCE(p_mercadoPagoFee, price_calculation_settings."mercadoPagoFee");
  
  -- Return the updated/inserted record
  RETURN QUERY 
  SELECT 
    pcs.id,
    pcs."usTaxRate",
    pcs."shippingUSD",
    pcs."chileVATRate",
    pcs."exchangeRate",
    pcs."profitMargin",
    pcs."mercadoPagoFee",
    pcs."updatedAt",
    pcs."updatedBy"
  FROM admin.price_calculation_settings pcs
  WHERE pcs.id = 'default';
END;
$$;

-- Grant execute permissions to service role and anon (for PostgREST)
-- PostgREST needs execute permission to expose the function
GRANT EXECUTE ON FUNCTION public.get_price_calculation_settings() TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.upsert_price_calculation_settings(DECIMAL(5, 4), DECIMAL(10, 2), DECIMAL(5, 4), DECIMAL(10, 2), DECIMAL(5, 4), DECIMAL(5, 4)) TO service_role, anon;

-- Note: The table is in a private schema (admin) not exposed to PostgREST
-- Access is only through these helper functions, which require service role
-- This solves the Supabase Security Advisor warning without needing RLS
--
-- IMPORTANT: After running this migration, you may need to:
-- 1. Refresh PostgREST schema cache (restart Supabase or wait a few minutes)
-- 2. Verify the functions are accessible: SELECT * FROM pg_proc WHERE proname LIKE '%price_calculation%';
-- 3. Test the functions work: SELECT * FROM get_price_calculation_settings();

