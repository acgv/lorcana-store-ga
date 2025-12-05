-- Verificar si las cartas EN TU COLECCIÓN tienen color
-- Reemplaza 'TU_USER_ID' con tu ID de usuario de Supabase

-- 1. Ver tus cartas y si tienen color
SELECT 
  c.id,
  c.name,
  c.set,
  c."inkColor",
  uc.quantity_normal,
  uc.quantity_foil
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved'
  AND uc.user_id = 'TU_USER_ID'  -- ⚠️ CAMBIA ESTO por tu user_id
ORDER BY c.name
LIMIT 30;

-- 2. Contar tus cartas: con color vs sin color
SELECT 
  COUNT(DISTINCT c.id) as total_cartas_en_tu_coleccion,
  COUNT(DISTINCT CASE WHEN c."inkColor" IS NOT NULL AND c."inkColor" != '' THEN c.id END) as cartas_con_color,
  COUNT(DISTINCT CASE WHEN c."inkColor" IS NULL OR c."inkColor" = '' THEN c.id END) as cartas_sin_color
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved'
  AND uc.user_id = 'TU_USER_ID';  -- ⚠️ CAMBIA ESTO por tu user_id

-- 3. Ver colores únicos de TUS cartas
SELECT 
  c."inkColor",
  COUNT(DISTINCT c.id) as cantidad_cartas
FROM cards c
INNER JOIN user_collections uc ON LOWER(TRIM(c.id)) = LOWER(TRIM(uc.card_id))
WHERE c.status = 'approved' 
  AND c."inkColor" IS NOT NULL 
  AND c."inkColor" != ''
  AND uc.user_id = 'TU_USER_ID'  -- ⚠️ CAMBIA ESTO por tu user_id
GROUP BY c."inkColor"
ORDER BY cantidad_cartas DESC;

