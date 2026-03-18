-- Agregar columna user_email a public.orders para guardar el correo del usuario en la plataforma
-- (además de customer_email que es el correo del pago en Mercado Pago)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN user_email text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_email_idx ON public.orders(user_email);

