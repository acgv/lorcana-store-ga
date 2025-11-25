-- Agregar columna productType a la tabla cards
-- Ejecutar en Supabase SQL Editor

-- Agregar columna si no existe
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS "productType" text DEFAULT 'card';

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS cards_product_type_idx ON public.cards("productType");

-- Actualizar todas las cartas existentes para que tengan productType = 'card'
UPDATE public.cards 
SET "productType" = 'card' 
WHERE "productType" IS NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.cards."productType" IS 'Tipo de producto: card, booster, playmat, sleeves, deckbox, dice, accessory';

