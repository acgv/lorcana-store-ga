-- Migration: Create price_calculation_settings table
-- Description: Stores price calculation parameters (tax rates, exchange rate, etc.) for admin use
-- Date: 2025-01-30

-- Create table for price calculation settings
CREATE TABLE IF NOT EXISTS public.price_calculation_settings (
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

-- Add comment
COMMENT ON TABLE public.price_calculation_settings IS 'Stores price calculation parameters used for converting USD prices to CLP';

-- Insert default values if table is empty
INSERT INTO public.price_calculation_settings (id, "usTaxRate", "shippingUSD", "chileVATRate", "exchangeRate", "profitMargin", "mercadoPagoFee")
VALUES ('default', 0.08, 8.00, 0.19, 1000.00, 0.20, 0.034)
ON CONFLICT (id) DO NOTHING;

-- Create update trigger
CREATE TRIGGER set_price_calculation_settings_updated_at
BEFORE UPDATE ON public.price_calculation_settings
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.price_calculation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write
-- Usa la función helper is_admin() que verifica en la tabla user_roles
CREATE POLICY "Admins can manage price calculation settings"
ON public.price_calculation_settings
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

