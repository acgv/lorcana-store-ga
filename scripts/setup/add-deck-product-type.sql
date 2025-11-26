-- Agregar "deck" como tipo de producto válido
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar el constraint existente
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Agregar nuevo constraint que incluya "deck"
ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check
CHECK (productType IN ('booster', 'playmat', 'sleeves', 'deckbox', 'dice', 'accessory', 'deck'));

-- Actualizar comentario
COMMENT ON COLUMN public.products.productType IS 'Tipo de producto: booster, playmat, sleeves, deckbox, dice, accessory, deck';

