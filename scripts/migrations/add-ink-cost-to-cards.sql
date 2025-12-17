-- Agregar costo de tinta (ink cost) a cards
-- Fuente: Lorcana API campo "Cost" (integer)
-- IMPORTANTE: esto NO toca price/stock.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cards'
      AND column_name = 'inkCost'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN "inkCost" integer;
    COMMENT ON COLUMN public.cards."inkCost" IS 'Costo de tinta para jugar la carta (Lorcana API: Cost)';
    CREATE INDEX IF NOT EXISTS cards_inkCost_idx ON public.cards("inkCost");
  END IF;
END $$;


