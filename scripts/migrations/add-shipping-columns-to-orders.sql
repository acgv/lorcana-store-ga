-- Agregar columnas de fulfillment/envío a public.orders
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_method'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_address jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_cost'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_phone'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_phone text;
  END IF;
END $$;

-- Índices opcionales
CREATE INDEX IF NOT EXISTS orders_shipping_method_idx ON public.orders(shipping_method);

