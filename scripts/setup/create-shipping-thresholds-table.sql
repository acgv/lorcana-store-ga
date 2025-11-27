-- Crear tabla para almacenar umbrales de envío configurables
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.shipping_thresholds (
  id text PRIMARY KEY DEFAULT 'default',
  free_shipping_threshold numeric NOT NULL DEFAULT 50000,
  zone_rm_cost numeric NOT NULL DEFAULT 5000,
  zone_other_cost numeric NOT NULL DEFAULT 8000,
  zone_extreme_cost numeric NOT NULL DEFAULT 12000,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Insertar valores por defecto
INSERT INTO public.shipping_thresholds (id, free_shipping_threshold, zone_rm_cost, zone_other_cost, zone_extreme_cost)
VALUES ('default', 50000, 5000, 8000, 12000)
ON CONFLICT (id) DO NOTHING;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_shipping_thresholds_updated_at ON public.shipping_thresholds;
CREATE TRIGGER set_shipping_thresholds_updated_at
BEFORE UPDATE ON public.shipping_thresholds
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.shipping_thresholds ENABLE ROW LEVEL SECURITY;

-- Policy: Public read
DROP POLICY IF EXISTS "Read shipping thresholds" ON public.shipping_thresholds;
CREATE POLICY "Read shipping thresholds"
  ON public.shipping_thresholds
  FOR SELECT
  USING (true);

-- Policy: Admin can update
DROP POLICY IF EXISTS "Admin can update shipping thresholds" ON public.shipping_thresholds;
CREATE POLICY "Admin can update shipping thresholds"
  ON public.shipping_thresholds
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.shipping_thresholds IS 'Umbrales de envío configurables desde el panel de admin';
COMMENT ON COLUMN public.shipping_thresholds.free_shipping_threshold IS 'Monto mínimo para envío gratis (CLP)';
COMMENT ON COLUMN public.shipping_thresholds.zone_rm_cost IS 'Costo de envío para Región Metropolitana (CLP)';
COMMENT ON COLUMN public.shipping_thresholds.zone_other_cost IS 'Costo de envío para otras regiones (CLP)';
COMMENT ON COLUMN public.shipping_thresholds.zone_extreme_cost IS 'Costo de envío para zonas extremas (CLP)';

