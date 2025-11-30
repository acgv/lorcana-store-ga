-- Fix trigger for price_calculation_settings table
-- The trigger was trying to use set_updated_at() which looks for updated_at,
-- but the column is "updatedAt" (camelCase)

-- Drop the old trigger
DROP TRIGGER IF EXISTS set_price_calculation_settings_updated_at ON public.price_calculation_settings;

-- Create a specific function for this table that uses "updatedAt" (camelCase)
CREATE OR REPLACE FUNCTION public.set_price_calculation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the correct function
CREATE TRIGGER set_price_calculation_settings_updated_at
BEFORE UPDATE ON public.price_calculation_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_price_calculation_settings_updated_at();

