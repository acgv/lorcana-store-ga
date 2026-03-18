-- Agregar columna user_id a public.orders para match interno con auth.users
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN user_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);

