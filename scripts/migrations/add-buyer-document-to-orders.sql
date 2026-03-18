-- Agregar columnas para documento (RUT) del comprador en public.orders
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'buyer_document_type'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN buyer_document_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'buyer_document_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN buyer_document_number text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_buyer_document_number_idx ON public.orders(buyer_document_number);

