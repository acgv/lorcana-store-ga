-- Verification and Refresh Script for Price Calculation Functions
-- Run this if you get PGRST202 errors after running move-price-calculation-settings-to-private-schema.sql
-- Date: 2025-12-01

-- Step 1: Verify functions exist
SELECT 
  'Function Check' as check_type,
  proname as function_name,
  pronamespace::regnamespace as schema_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('get_price_calculation_settings', 'upsert_price_calculation_settings')
ORDER BY proname;

-- Step 2: Verify permissions
SELECT 
  'Permission Check' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN ('get_price_calculation_settings', 'upsert_price_calculation_settings')
ORDER BY routine_name, grantee;

-- Step 3: Test the functions work
SELECT 'Testing get_price_calculation_settings...' as status;
SELECT * FROM get_price_calculation_settings();

-- Step 4: Try to force PostgREST schema refresh
-- Note: This may not work in all Supabase versions, but it's worth trying
NOTIFY pgrst, 'reload schema';

-- Step 5: Final verification
SELECT 
  'Final Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_price_calculation_settings' 
      AND pronamespace = 'public'::regnamespace
    ) THEN '✅ get_price_calculation_settings exists'
    ELSE '❌ get_price_calculation_settings NOT FOUND'
  END as get_function_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'upsert_price_calculation_settings' 
      AND pronamespace = 'public'::regnamespace
    ) THEN '✅ upsert_price_calculation_settings exists'
    ELSE '❌ upsert_price_calculation_settings NOT FOUND'
  END as upsert_function_status;

-- Instructions:
-- If functions exist but PostgREST still can't find them:
-- 1. Wait 2-3 minutes for automatic refresh
-- 2. Try restarting your Supabase project (Settings > Database > Restart)
-- 3. Check Supabase logs for PostgREST errors
-- 4. Verify you're using the service role key (not anon key) in your backend code

