-- Agregar "giftset" como tipo de producto válido
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar el constraint existente (probar ambos nombres posibles)
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_producttype_check;

-- Agregar nuevo constraint que incluya "giftset"
-- Nota: La columna en Supabase puede ser "productType" (camelCase) o "producttype" (lowercase)
-- Verificar primero el nombre real de la columna
DO $$
BEGIN
  -- Si la columna es "productType" (camelCase)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'products' 
             AND column_name = 'productType') THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_producttype_check
    CHECK ("productType" IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory', 'giftset'));
  -- Si la columna es "producttype" (lowercase)
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'producttype') THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_producttype_check
    CHECK (producttype IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory', 'giftset'));
  END IF;
END $$;

-- Actualizar comentario
COMMENT ON COLUMN public.products.productType IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory, giftset';
COMMENT ON COLUMN public.products.producttype IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory, giftset';

