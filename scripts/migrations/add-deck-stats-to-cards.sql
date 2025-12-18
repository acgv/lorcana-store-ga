-- Agregar campos de stats para construcción inteligente de mazos
-- Fuente: Lorcana API campos "Inkable", "Lore", "Strength", "Willpower", "Classifications"
-- IMPORTANTE: esto NO toca price/stock.

DO $$
BEGIN
  -- inkable (boolean) - si la carta puede ir al inkwell
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'inkable'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "inkable" boolean;
    COMMENT ON COLUMN public.cards."inkable" IS 'Si la carta puede ir al inkwell (Lorcana API: Inkable)';
    CREATE INDEX IF NOT EXISTS cards_inkable_idx ON public.cards("inkable");
  END IF;

  -- lore (integer) - lore que genera la carta al quest
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'lore'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "lore" integer;
    COMMENT ON COLUMN public.cards."lore" IS 'Lore que genera la carta al quest (Lorcana API: Lore)';
    CREATE INDEX IF NOT EXISTS cards_lore_idx ON public.cards("lore");
  END IF;

  -- strength (integer) - fuerza de la carta
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'strength'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "strength" integer;
    COMMENT ON COLUMN public.cards."strength" IS 'Fuerza de la carta para challenges (Lorcana API: Strength)';
    CREATE INDEX IF NOT EXISTS cards_strength_idx ON public.cards("strength");
  END IF;

  -- willpower (integer) - resistencia de la carta
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'willpower'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "willpower" integer;
    COMMENT ON COLUMN public.cards."willpower" IS 'Resistencia/vida de la carta (Lorcana API: Willpower)';
    CREATE INDEX IF NOT EXISTS cards_willpower_idx ON public.cards("willpower");
  END IF;

  -- classifications (text) - clasificaciones/tribus (ej: "Storyborn, Ally")
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'classifications'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "classifications" text;
    COMMENT ON COLUMN public.cards."classifications" IS 'Clasificaciones/tribus de la carta para sinergias (Lorcana API: Classifications)';
    CREATE INDEX IF NOT EXISTS cards_classifications_idx ON public.cards("classifications");
  END IF;
END $$;

