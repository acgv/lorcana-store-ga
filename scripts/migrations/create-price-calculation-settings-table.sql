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

-- Create update trigger (drop if exists first)
DROP TRIGGER IF EXISTS set_price_calculation_settings_updated_at ON public.price_calculation_settings;
CREATE TRIGGER set_price_calculation_settings_updated_at
BEFORE UPDATE ON public.price_calculation_settings
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.price_calculation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write
-- Primero eliminar la política si existe
DROP POLICY IF EXISTS "Admins can manage price calculation settings" ON public.price_calculation_settings;

-- Crear política: verificar si la función is_admin() existe, si no, usar verificación directa
DO $$
BEGIN
  -- Intentar usar la función is_admin() si existe
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Usar la función helper is_admin()
    EXECUTE 'CREATE POLICY "Admins can manage price calculation settings"
      ON public.price_calculation_settings
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  ELSE
    -- Si no existe, usar verificación directa en user_roles
    EXECUTE 'CREATE POLICY "Admins can manage price calculation settings"
      ON public.price_calculation_settings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = ''admin''
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = ''admin''
        )
      )';
  END IF;
END $$;

