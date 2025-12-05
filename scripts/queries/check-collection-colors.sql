-- Query para verificar si las cartas en las colecciones de usuarios tienen color
-- Ejecuta esto en Supabase SQL Editor

-- Ver cartas en colecciones y si tienen color
SELECT DISTINCT 
  c.id,
  c.name,
  c.set,
  c."inkColor",
  COUNT(DISTINCT uc.user_id) as usuarios_con_esta_carta
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved'
GROUP BY c.id, c.name, c.set, c."inkColor"
ORDER BY c.name
LIMIT 30;

-- Contar cartas en colecciones: con color vs sin color
SELECT 
  COUNT(DISTINCT c.id) as total_cartas_en_colecciones,
  COUNT(DISTINCT CASE WHEN c."inkColor" IS NOT NULL AND c."inkColor" != '' THEN c.id END) as cartas_con_color,
  COUNT(DISTINCT CASE WHEN c."inkColor" IS NULL OR c."inkColor" = '' THEN c.id END) as cartas_sin_color
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved';

-- Ver colores únicos de las cartas que están en colecciones
SELECT 
  c."inkColor",
  COUNT(DISTINCT c.id) as cantidad_cartas
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved' 
  AND c."inkColor" IS NOT NULL 
  AND c."inkColor" != ''
GROUP BY c."inkColor"
ORDER BY cantidad_cartas DESC;

