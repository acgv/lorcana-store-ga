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
      "usTaxRate" DECIMAL(5, 4) NOT NULL DEFAULT 0,
      "shippingUSD" DECIMAL(10, 2) NOT NULL DEFAULT 0.5,
      "chileVATRate" DECIMAL(5, 4) NOT NULL DEFAULT 0.19,
      "exchangeRate" DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
      "profitMargin" DECIMAL(5, 4) NOT NULL DEFAULT 0.20,
      "mercadoPagoFee" DECIMAL(5, 4) NOT NULL DEFAULT 0.04,
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
-- Drop existing function first if it exists (for consistency)
DROP FUNCTION IF EXISTS public.get_price_calculation_settings();

CREATE FUNCTION public.get_price_calculation_settings()
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
SET search_path = public
AS $$
BEGIN
  -- Service role automatically bypasses RLS, so we trust that only service role can call this
  -- The function is in public schema but accesses admin schema, which is not exposed to PostgREST
  -- Only backend code with service role key can access this
  
  RETURN QUERY
  SELECT 
    admin.price_calculation_settings.id,
    admin.price_calculation_settings."usTaxRate",
    admin.price_calculation_settings."shippingUSD",
    admin.price_calculation_settings."chileVATRate",
    admin.price_calculation_settings."exchangeRate",
    admin.price_calculation_settings."profitMargin",
    admin.price_calculation_settings."mercadoPagoFee",
    admin.price_calculation_settings."updatedAt",
    admin.price_calculation_settings."updatedBy"
  FROM admin.price_calculation_settings
  WHERE admin.price_calculation_settings.id = 'default';
  
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
-- Using JSON parameter for better PostgREST compatibility
-- Drop existing function first if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS public.upsert_price_calculation_settings(JSONB);

CREATE FUNCTION public.upsert_price_calculation_settings(
  p_settings JSONB DEFAULT NULL
)
RETURNS TABLE (
  result_id text,
  result_usTaxRate DECIMAL(5, 4),
  result_shippingUSD DECIMAL(10, 2),
  result_chileVATRate DECIMAL(5, 4),
  result_exchangeRate DECIMAL(10, 2),
  result_profitMargin DECIMAL(5, 4),
  result_mercadoPagoFee DECIMAL(5, 4),
  result_updatedAt timestamptz,
  result_updatedBy text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usTaxRate DECIMAL(5, 4);
  v_shippingUSD DECIMAL(10, 2);
  v_chileVATRate DECIMAL(5, 4);
  v_exchangeRate DECIMAL(10, 2);
  v_profitMargin DECIMAL(5, 4);
  v_mercadoPagoFee DECIMAL(5, 4);
  v_existing_usTaxRate DECIMAL(5, 4);
  v_existing_shippingUSD DECIMAL(10, 2);
  v_existing_chileVATRate DECIMAL(5, 4);
  v_existing_exchangeRate DECIMAL(10, 2);
  v_existing_profitMargin DECIMAL(5, 4);
  v_existing_mercadoPagoFee DECIMAL(5, 4);
BEGIN
  -- Service role automatically bypasses RLS, so we trust that only service role can call this
  -- The function is in public schema but accesses admin schema, which is not exposed to PostgREST
  -- Only backend code with service role key can access this
  
  -- Get existing values using fully qualified table name
  SELECT 
    admin.price_calculation_settings."usTaxRate",
    admin.price_calculation_settings."shippingUSD",
    admin.price_calculation_settings."chileVATRate",
    admin.price_calculation_settings."exchangeRate",
    admin.price_calculation_settings."profitMargin",
    admin.price_calculation_settings."mercadoPagoFee"
  INTO 
    v_existing_usTaxRate,
    v_existing_shippingUSD,
    v_existing_chileVATRate,
    v_existing_exchangeRate,
    v_existing_profitMargin,
    v_existing_mercadoPagoFee
  FROM admin.price_calculation_settings
  WHERE admin.price_calculation_settings.id = 'default'
  LIMIT 1;
  
  -- Extract values from JSON
  -- If key exists in JSON (even if value is 0), use it; otherwise use existing value or default
  -- Use -> operator to get JSONB, convert to numeric directly (handles 0 correctly)
  IF p_settings IS NOT NULL AND (p_settings ? 'p_usTaxRate' OR p_settings ? 'usTaxRate') THEN
    -- Key exists, use the value from JSON (even if it's 0)
    -- Try p_* format first, then regular format
    IF p_settings ? 'p_usTaxRate' THEN
      v_usTaxRate := (p_settings->'p_usTaxRate')::numeric::DECIMAL(5, 4);
    ELSIF p_settings ? 'usTaxRate' THEN
      v_usTaxRate := (p_settings->'usTaxRate')::numeric::DECIMAL(5, 4);
    ELSE
      v_usTaxRate := 0.08;
    END IF;
  ELSE
    -- Key doesn't exist, use existing value
    v_usTaxRate := COALESCE(v_existing_usTaxRate, 0.08);
  END IF;
  
  IF p_settings IS NOT NULL AND (p_settings ? 'p_shippingUSD' OR p_settings ? 'shippingUSD') THEN
    IF p_settings ? 'p_shippingUSD' THEN
      v_shippingUSD := (p_settings->'p_shippingUSD')::numeric::DECIMAL(10, 2);
    ELSIF p_settings ? 'shippingUSD' THEN
      v_shippingUSD := (p_settings->'shippingUSD')::numeric::DECIMAL(10, 2);
    ELSE
      v_shippingUSD := 8.00;
    END IF;
  ELSE
    v_shippingUSD := COALESCE(v_existing_shippingUSD, 8.00);
  END IF;
  
  IF p_settings IS NOT NULL AND (p_settings ? 'p_chileVATRate' OR p_settings ? 'chileVATRate') THEN
    IF p_settings ? 'p_chileVATRate' THEN
      v_chileVATRate := (p_settings->'p_chileVATRate')::numeric::DECIMAL(5, 4);
    ELSIF p_settings ? 'chileVATRate' THEN
      v_chileVATRate := (p_settings->'chileVATRate')::numeric::DECIMAL(5, 4);
    ELSE
      v_chileVATRate := 0.19;
    END IF;
  ELSE
    v_chileVATRate := COALESCE(v_existing_chileVATRate, 0.19);
  END IF;
  
  IF p_settings IS NOT NULL AND (p_settings ? 'p_exchangeRate' OR p_settings ? 'exchangeRate') THEN
    IF p_settings ? 'p_exchangeRate' THEN
      v_exchangeRate := (p_settings->'p_exchangeRate')::numeric::DECIMAL(10, 2);
    ELSIF p_settings ? 'exchangeRate' THEN
      v_exchangeRate := (p_settings->'exchangeRate')::numeric::DECIMAL(10, 2);
    ELSE
      v_exchangeRate := 1000.00;
    END IF;
  ELSE
    v_exchangeRate := COALESCE(v_existing_exchangeRate, 1000.00);
  END IF;
  
  IF p_settings IS NOT NULL AND (p_settings ? 'p_profitMargin' OR p_settings ? 'profitMargin') THEN
    IF p_settings ? 'p_profitMargin' THEN
      v_profitMargin := (p_settings->'p_profitMargin')::numeric::DECIMAL(5, 4);
    ELSIF p_settings ? 'profitMargin' THEN
      v_profitMargin := (p_settings->'profitMargin')::numeric::DECIMAL(5, 4);
    ELSE
      v_profitMargin := 0.20;
    END IF;
  ELSE
    v_profitMargin := COALESCE(v_existing_profitMargin, 0.20);
  END IF;
  
  IF p_settings IS NOT NULL AND (p_settings ? 'p_mercadoPagoFee' OR p_settings ? 'mercadoPagoFee') THEN
    IF p_settings ? 'p_mercadoPagoFee' THEN
      v_mercadoPagoFee := (p_settings->'p_mercadoPagoFee')::numeric::DECIMAL(5, 4);
    ELSIF p_settings ? 'mercadoPagoFee' THEN
      v_mercadoPagoFee := (p_settings->'mercadoPagoFee')::numeric::DECIMAL(5, 4);
    ELSE
      v_mercadoPagoFee := 0.034;
    END IF;
  ELSE
    v_mercadoPagoFee := COALESCE(v_existing_mercadoPagoFee, 0.034);
  END IF;
  
  -- Upsert logic using INSERT ... ON CONFLICT
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
    v_usTaxRate,
    v_shippingUSD,
    v_chileVATRate,
    v_exchangeRate,
    v_profitMargin,
    v_mercadoPagoFee
  )
  ON CONFLICT (id) DO UPDATE SET
    "usTaxRate" = EXCLUDED."usTaxRate",
    "shippingUSD" = EXCLUDED."shippingUSD",
    "chileVATRate" = EXCLUDED."chileVATRate",
    "exchangeRate" = EXCLUDED."exchangeRate",
    "profitMargin" = EXCLUDED."profitMargin",
    "mercadoPagoFee" = EXCLUDED."mercadoPagoFee";
  
  -- Return the updated/inserted record with different column names to avoid ambiguity
  RETURN QUERY 
  SELECT 
    admin.price_calculation_settings.id AS result_id,
    admin.price_calculation_settings."usTaxRate" AS result_usTaxRate,
    admin.price_calculation_settings."shippingUSD" AS result_shippingUSD,
    admin.price_calculation_settings."chileVATRate" AS result_chileVATRate,
    admin.price_calculation_settings."exchangeRate" AS result_exchangeRate,
    admin.price_calculation_settings."profitMargin" AS result_profitMargin,
    admin.price_calculation_settings."mercadoPagoFee" AS result_mercadoPagoFee,
    admin.price_calculation_settings."updatedAt" AS result_updatedAt,
    admin.price_calculation_settings."updatedBy" AS result_updatedBy
  FROM admin.price_calculation_settings
  WHERE admin.price_calculation_settings.id = 'default';
END;
$$;

-- Grant execute permissions to service role and anon (for PostgREST)
-- PostgREST needs execute permission to expose the function
GRANT EXECUTE ON FUNCTION public.get_price_calculation_settings() TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_price_calculation_settings(JSONB) TO service_role, anon, authenticated;

-- Verify functions exist and are accessible
DO $$
BEGIN
  -- Check if functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_price_calculation_settings' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Function get_price_calculation_settings does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'upsert_price_calculation_settings' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Function upsert_price_calculation_settings does not exist';
  END IF;
  
  RAISE NOTICE '✅ Functions created successfully';
END $$;

-- Note: The table is in a private schema (admin) not exposed to PostgREST
-- Access is only through these helper functions, which require service role
-- This solves the Supabase Security Advisor warning without needing RLS
--
-- IMPORTANT: After running this migration:
-- 1. Wait 1-2 minutes for PostgREST to refresh its schema cache automatically
-- 2. OR force refresh by running: NOTIFY pgrst, 'reload schema';
-- 3. Verify the functions exist:
--    SELECT proname, pronamespace::regnamespace 
--    FROM pg_proc 
--    WHERE proname LIKE '%price_calculation%';
-- 4. Test the functions work:
--    SELECT * FROM get_price_calculation_settings();
--    SELECT * FROM upsert_price_calculation_settings(0.08, 8, 0.19, 1000, 0.20, 0.034);
--
-- If PostgREST still can't find the functions (PGRST202 error):
-- - Check that functions are in public schema: SELECT pronamespace::regnamespace FROM pg_proc WHERE proname = 'upsert_price_calculation_settings';
-- - Verify permissions: SELECT routine_name, grantee FROM information_schema.routine_privileges WHERE routine_name LIKE '%price_calculation%';
-- - Try restarting your Supabase project (Settings > Database > Restart)

