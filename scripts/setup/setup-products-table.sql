-- ============================================
-- CONFIGURACIÓN COMPLETA DE TABLA PRODUCTS
-- ============================================
-- Este script configura la tabla products con:
-- - Columna productType
-- - Tipos de producto (booster, playmat, sleeves, deckbox, dice, accessory, deck, giftset)
-- - Políticas RLS para INSERT y UPDATE
-- - Trigger para updated_at
-- ============================================

-- 1. CREAR TABLA PRODUCTS (si no existe)
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  stock integer DEFAULT 0,
  image text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "productType" text NOT NULL DEFAULT 'booster',
  created_at timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- 2. AGREGAR COLUMNA productType SI NO EXISTE
DO $$
BEGIN
  -- Si la columna no existe, crearla
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'productType'
  ) THEN
    -- Si existe producttype (lowercase), eliminarla primero
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'producttype'
    ) THEN
      ALTER TABLE public.products DROP COLUMN producttype;
    END IF;
    
    -- Crear columna productType (camelCase)
    ALTER TABLE public.products
    ADD COLUMN "productType" text NOT NULL DEFAULT 'booster';
  END IF;
END $$;

-- 3. CONFIGURAR CONSTRAINT PARA TIPOS DE PRODUCTO
-- Eliminar constraint existente si existe
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_producttype_check;

-- Crear constraint con todos los tipos válidos
ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check
CHECK ("productType" IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory', 'deck', 'giftset'));

-- 4. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products("productType");
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);

-- 5. ACTUALIZAR PRODUCTOS EXISTENTES
UPDATE public.products 
SET "productType" = 'booster' 
WHERE "productType" IS NULL;

-- 6. COMENTARIOS
COMMENT ON TABLE public.products IS 'Productos sellados de Lorcana (boosters, playmats, etc.)';
COMMENT ON COLUMN public.products."productType" IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory, deck, giftset';

-- 7. POLÍTICAS RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admin/service role to insert products
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow admin/service role to update products
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
  ON public.products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read of approved products
DROP POLICY IF EXISTS "Public can read approved products" ON public.products;
CREATE POLICY "Public can read approved products"
  ON public.products
  FOR SELECT
  USING (status = 'approved');

-- 8. TRIGGER PARA updatedAt
CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar updatedAt (camelCase)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'products' 
             AND column_name = 'updatedAt') THEN
    NEW."updatedAt" = now();
  -- Si no existe, intentar updated_at (snake_case)
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'updated_at') THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger antiguo si existe
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;

-- Crear trigger
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_products_updated_at();

-- 9. ASEGURAR QUE LA COLUMNA updatedAt EXISTE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'products' 
                 AND column_name = 'updatedAt') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'products' 
                   AND column_name = 'updated_at') THEN
      ALTER TABLE public.products ADD COLUMN "updatedAt" timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

