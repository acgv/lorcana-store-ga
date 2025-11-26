-- Tabla para almacenar promociones del sitio
CREATE TABLE IF NOT EXISTS public.promotions (
  id text PRIMARY KEY DEFAULT 'black-friday-2025',
  name text NOT NULL,
  is_active boolean DEFAULT false,
  title text,
  description text,
  discount_percentage integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  banner_text text,
  banner_color text DEFAULT '#000000',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insertar promoción inicial (inactiva)
INSERT INTO public.promotions (id, name, is_active, title, description, discount_percentage, banner_text, banner_color)
VALUES (
  'black-friday-2025',
  'Black Friday 2025',
  false,
  '¡Viernes Negro!',
  'Descuentos especiales en toda la tienda',
  0,
  '🎉 ¡Viernes Negro! Descuentos especiales',
  '#000000'
)
ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS promotions_is_active_idx ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS promotions_name_idx ON public.promotions(name);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de promociones activas
DROP POLICY IF EXISTS "Read active promotions" ON public.promotions;
CREATE POLICY "Read active promotions"
  ON public.promotions
  FOR SELECT
  USING (is_active = true);

-- Permitir lectura completa a admins (usando service role)
-- Los admins accederán vía service role, así que no necesitamos policy adicional

COMMENT ON TABLE public.promotions IS 'Promociones del sitio (Black Friday, etc.)';
COMMENT ON COLUMN public.promotions.is_active IS 'Si la promoción está activa y visible';
COMMENT ON COLUMN public.promotions.banner_text IS 'Texto a mostrar en el banner';
COMMENT ON COLUMN public.promotions.banner_color IS 'Color del banner en formato hex';

