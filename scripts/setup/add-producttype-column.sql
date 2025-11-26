-- Agregar columna producttype a la tabla products
-- Ejecutar en Supabase SQL Editor

-- Agregar columna producttype (sin comillas, minúsculas)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS producttype text NOT NULL DEFAULT 'booster';

-- Agregar constraint para validar los valores
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_producttype_check;

ALTER TABLE public.products
ADD CONSTRAINT products_producttype_check
CHECK (producttype IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory'));

-- Crear índice
CREATE INDEX IF NOT EXISTS products_producttype_idx ON public.products(producttype);

-- Actualizar productos existentes (si hay alguno)
UPDATE public.products 
SET producttype = 'booster' 
WHERE producttype IS NULL;

-- Agregar comentario
COMMENT ON COLUMN public.products.producttype IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory';

