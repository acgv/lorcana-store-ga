-- Crear una función RPC para obtener cartas con color
-- Esto evita el problema del schema cache de PostgREST
-- Ejecuta esto en Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_cards_with_ink_color()
RETURNS TABLE (
  id text,
  name text,
  set text,
  type text,
  rarity text,
  number integer,
  "cardNumber" text,
  price numeric,
  "foilPrice" numeric,
  "normalStock" integer,
  "foilStock" integer,
  image text,
  "productType" text,
  description text,
  "inkColor" text,
  color text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.set,
    c.type,
    c.rarity,
    c.number,
    c."cardNumber",
    c.price,
    c."foilPrice",
    c."normalStock",
    c."foilStock",
    c.image,
    c."productType",
    c.description,
    c."inkColor",
    c.color
  FROM cards c
  WHERE c.status = 'approved';
END;
$$;

-- Dar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_cards_with_ink_color() TO anon, authenticated, service_role;

-- Comentario
COMMENT ON FUNCTION get_cards_with_ink_color() IS 'Obtiene todas las cartas aprobadas con sus colores, evitando problemas del schema cache de PostgREST';

