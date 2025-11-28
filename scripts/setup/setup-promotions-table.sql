-- ============================================
-- CONFIGURACIÓN COMPLETA DE TABLA PROMOTIONS
-- ============================================
-- Este script crea y configura la tabla promotions con:
-- - Estructura completa de campos
-- - Tipos de descuento (productos y envío)
-- - Trigger para updated_at
-- - Políticas RLS
-- ============================================

-- 1. CREAR TABLA PROMOTIONS
CREATE TABLE IF NOT EXISTS public.promotions (
  id text PRIMARY KEY DEFAULT 'black-friday-2025',
  name text NOT NULL,
  is_active boolean DEFAULT false,
  title text,
  description text,
  -- Descuentos en productos
  discount_percentage integer DEFAULT 0,
  discount_minimum_amount numeric DEFAULT 0,
  -- Descuentos en envío
  shipping_discount_percentage integer DEFAULT 0,
  free_shipping boolean DEFAULT false,
  free_shipping_minimum_amount numeric DEFAULT 0,
  -- Fechas
  start_date timestamptz,
  end_date timestamptz,
  -- Banner
  banner_text text,
  banner_color text DEFAULT '#000000',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. AGREGAR COLUMNAS SI NO EXISTEN (para actualizaciones)
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS discount_minimum_amount numeric DEFAULT 0;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS shipping_discount_percentage integer DEFAULT 0;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS free_shipping boolean DEFAULT false;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS free_shipping_minimum_amount numeric DEFAULT 0;

-- 3. INSERTAR PROMOCIÓN INICIAL (si no existe)
INSERT INTO public.promotions (
  id, name, is_active, title, description, 
  discount_percentage, discount_minimum_amount,
  shipping_discount_percentage, free_shipping, free_shipping_minimum_amount,
  banner_text, banner_color
)
VALUES (
  'black-friday-2025',
  'Black Friday 2025',
  false,
  '¡Viernes Negro!',
  'Descuentos especiales en toda la tienda',
  0, -- discount_percentage
  0, -- discount_minimum_amount
  0, -- shipping_discount_percentage
  false, -- free_shipping
  0, -- free_shipping_minimum_amount
  '🎉 ¡Viernes Negro! Descuentos especiales',
  '#000000'
)
ON CONFLICT (id) DO NOTHING;

-- 4. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS promotions_is_active_idx ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS promotions_name_idx ON public.promotions(name);

-- 5. TRIGGER PARA updated_at
CREATE OR REPLACE FUNCTION public.set_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;

-- Crear trigger
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_promotions_updated_at();

-- 6. POLÍTICAS RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de promociones activas
DROP POLICY IF EXISTS "Read active promotions" ON public.promotions;
CREATE POLICY "Read active promotions"
  ON public.promotions
  FOR SELECT
  USING (is_active = true);

-- 7. COMENTARIOS
COMMENT ON TABLE public.promotions IS 'Promociones del sitio (Black Friday, etc.)';
COMMENT ON COLUMN public.promotions.is_active IS 'Si la promoción está activa y visible';
COMMENT ON COLUMN public.promotions.banner_text IS 'Texto a mostrar en el banner';
COMMENT ON COLUMN public.promotions.banner_color IS 'Color del banner en formato hex';
COMMENT ON COLUMN public.promotions.discount_minimum_amount IS 'Monto mínimo en CLP para aplicar descuento en productos';
COMMENT ON COLUMN public.promotions.shipping_discount_percentage IS 'Porcentaje de descuento en envío (0-100)';
COMMENT ON COLUMN public.promotions.free_shipping IS 'Si el envío es gratis cuando se cumple el monto mínimo';
COMMENT ON COLUMN public.promotions.free_shipping_minimum_amount IS 'Monto mínimo en CLP para envío gratis';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'promotions'
ORDER BY ordinal_position;

