-- Crear tabla products para productos que no son cartas (boosters, playmats, etc.)
-- Ejecutar en Supabase SQL Editor

-- Tabla products
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  image text,
  price numeric NOT NULL,
  stock integer DEFAULT 0,
  description text,
  productType text NOT NULL CHECK (productType IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory')),
  status text DEFAULT 'approved',
  -- Campos específicos por tipo (JSONB para flexibilidad)
  metadata jsonb DEFAULT '{}'::jsonb,
  createdAt timestamptz DEFAULT now(),
  updatedAt timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products(productType);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_name_idx ON public.products(name);

-- Trigger para updatedAt
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Public read for approved products
DROP POLICY IF EXISTS "Read approved products" ON public.products;
CREATE POLICY "Read approved products"
  ON public.products
  FOR SELECT
  USING (status = 'approved');

-- Comentarios
COMMENT ON TABLE public.products IS 'Productos que no son cartas individuales (boosters, playmats, sleeves, etc.)';
COMMENT ON COLUMN public.products.productType IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory';
COMMENT ON COLUMN public.products.metadata IS 'Campos específicos del producto según su tipo (set, cardsPerPack, material, size, etc.)';

