-- Query para ver ejemplos de cartas que tienen color
-- Ejecuta esto en Supabase SQL Editor

-- Ver cartas con color (primeras 20)
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
LIMIT 20;

-- Ver cartas con color agrupadas por color
SELECT 
  "inkColor",
  COUNT(*) as cantidad_cartas,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 5) as ejemplos
FROM cards
WHERE status = 'approved' 
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
GROUP BY "inkColor"
ORDER BY cantidad_cartas DESC;

-- Ver una carta específica con todos sus datos (reemplaza 'tfc-1' con el ID de una carta que quieras ver)
SELECT 
  id,
  name,
  set,
  type,
  rarity,
  "inkColor",
  "normalStock",
  "foilStock",
  price,
  "foilPrice"
FROM cards
WHERE id = 'tfc-1'  -- Cambia este ID por el de una carta que quieras ver
LIMIT 1;

