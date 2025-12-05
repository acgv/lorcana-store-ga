-- Agregar columna inkColor a la tabla cards
-- Esta migración agrega el campo de color de tinta (ink color) de las cartas de Lorcana

-- Agregar columna inkColor si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cards' 
    AND column_name = 'inkColor'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "inkColor" text;
    COMMENT ON COLUMN public.cards."inkColor" IS 'Color de tinta de la carta (Amber, Ruby, Emerald, Sapphire, Steel, Amethyst)';
  END IF;
END $$;

-- Crear índice para búsquedas por color
CREATE INDEX IF NOT EXISTS cards_inkColor_idx ON public.cards("inkColor");

-- Si ya existe la columna 'color' (sin camelCase), podemos renombrarla o mantener ambas
-- Por ahora solo agregamos inkColor que es el estándar

