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

-- Crear función específica para esta tabla que use "updatedAt" (camelCase)
CREATE OR REPLACE FUNCTION public.set_price_calculation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_price_calculation_settings_updated_at
BEFORE UPDATE ON public.price_calculation_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_price_calculation_settings_updated_at();

-- Enable RLS
ALTER TABLE public.price_calculation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write
-- Primero eliminar TODAS las políticas existentes si hay alguna
DROP POLICY IF EXISTS "Admins can manage price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "price_calculation_settings_policy" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can view price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can update price calculation settings" ON public.price_calculation_settings;

-- Verificar si la tabla user_roles existe antes de crear la política
DO $$
BEGIN
  -- Verificar si user_roles existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    -- Crear política usando verificación directa en user_roles
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
  ELSE
    -- Si user_roles no existe, crear política que permita todo (solo para desarrollo)
    -- En producción, esto debería requerir user_roles
    RAISE NOTICE 'Tabla user_roles no existe. Creando política permisiva (solo para desarrollo).';
    EXECUTE 'CREATE POLICY "Admins can manage price calculation settings"
      ON public.price_calculation_settings
      FOR ALL
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

