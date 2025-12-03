-- Migration: Move price_calculation_settings to private schema
-- Description: Moves the table to a private schema (admin) that is not exposed to PostgREST
-- This solves the Supabase Security Advisor warning without needing RLS policies
-- Date: 2025-12-01

-- Step 1: Create the admin schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS admin;

-- Step 2: Move the table to the admin schema
-- First, drop the trigger if it exists
DROP TRIGGER IF EXISTS set_price_calculation_settings_updated_at ON public.price_calculation_settings;

-- Move the table to admin schema
ALTER TABLE IF EXISTS public.price_calculation_settings SET SCHEMA admin;

-- Step 3: Recreate the trigger in the new schema
-- The function should already exist, but we'll recreate the trigger
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
  -- Only service role can call this function
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Only service role can access this function.';
  END IF;
  
  RETURN QUERY
  SELECT * FROM admin.price_calculation_settings
  WHERE id = 'default';
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
  -- Only service role can call this function
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Only service role can access this function.';
  END IF;
  
  -- Get existing record if it exists
  SELECT * INTO v_existing
  FROM admin.price_calculation_settings
  WHERE id = 'default'
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
  RETURN QUERY SELECT * FROM admin.price_calculation_settings WHERE id = 'default';
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.get_price_calculation_settings() TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_price_calculation_settings(DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO service_role;

-- Note: The table is in a private schema (admin) not exposed to PostgREST
-- Access is only through these helper functions, which require service role
-- This solves the Supabase Security Advisor warning without needing RLS

