-- Query para verificar si las cartas tienen el campo inkColor cargado
-- Ejecuta esto en Supabase SQL Editor

-- 1. Verificar si la columna existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'cards' 
  AND column_name = 'inkColor';

-- 2. Contar cartas con y sin color
SELECT 
  COUNT(*) as total_cartas,
  COUNT("inkColor") as cartas_con_color,
  COUNT(*) - COUNT("inkColor") as cartas_sin_color,
  ROUND(COUNT("inkColor")::numeric / COUNT(*)::numeric * 100, 2) as porcentaje_con_color
FROM cards
WHERE status = 'approved';

-- 3. Ver colores únicos y cuántas cartas hay de cada uno
SELECT 
  "inkColor",
  COUNT(*) as cantidad_cartas
FROM cards
WHERE status = 'approved' 
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
GROUP BY "inkColor"
ORDER BY cantidad_cartas DESC;

-- 4. Ejemplos de cartas CON color (primeras 10)
SELECT 
  id,
  name,
  set,
  "inkColor",
  "normalStock",
  "foilStock"
FROM cards
WHERE status = 'approved' 
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
ORDER BY name
LIMIT 10;

-- 5. Ejemplos de cartas SIN color (primeras 10)
SELECT 
  id,
  name,
  set,
  "inkColor",
  "normalStock",
  "foilStock"
FROM cards
WHERE status = 'approved' 
  AND ("inkColor" IS NULL OR "inkColor" = '')
ORDER BY name
LIMIT 10;

-- 6. Verificar cartas de tu colección (necesitas reemplazar 'TU_USER_ID' con tu ID real)
-- Primero obtén tu user_id de la tabla user_collections
SELECT DISTINCT 
  c.id,
  c.name,
  c.set,
  c."inkColor",
  uc.user_id
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved'
ORDER BY uc.user_id, c.name
LIMIT 20;

