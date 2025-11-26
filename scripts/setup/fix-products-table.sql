-- Agregar columna productType a la tabla products si no existe
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar la columna si existe con nombre incorrecto (sin comillas)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'producttype'
  ) THEN
    ALTER TABLE public.products DROP COLUMN producttype;
  END IF;
END $$;

-- Agregar columna productType con comillas (camelCase)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS "productType" text NOT NULL DEFAULT 'booster';

-- Agregar constraint para validar los valores
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check
CHECK ("productType" IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory'));

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products("productType");

-- Actualizar productos existentes (si hay alguno)
UPDATE public.products 
SET "productType" = 'booster' 
WHERE "productType" IS NULL;

-- Agregar comentario
COMMENT ON COLUMN public.products."productType" IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory';

