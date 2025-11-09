-- ============================================
-- APLICAR PRECIOS BASADOS EN RAREZA
-- ============================================
-- Este script asigna precios a cartas que NO tienen precio
-- basándose en su rareza y tu plantilla de precios.
--
-- IMPORTANTE:
-- 1. Ejecuta preview-pricing-update.sql PRIMERO
-- 2. Revisa los números y decide si proceder
-- 3. Este script NO toca cartas que YA tienen precio
-- 4. Solo actualiza donde price = 0 o NULL
-- ============================================

-- ============================================
-- MAPEO DE PRECIOS POR RAREZA
-- ============================================
-- Basado en: lorcana_pricing_template_chile.csv
--
-- Common:      $500 normal    / $500 foil
-- Uncommon:    $1,000 normal  / $1,000 foil
-- Rare:        $2,500 normal  / $4,000 foil (× 1.6)
-- Super Rare:  $5,000 normal  / $8,000 foil (× 1.6)
-- Legendary:   $30,000 normal / $50,000 foil (× 1.67)
-- ============================================

-- Actualizar COMMON
UPDATE public.cards
SET 
  price = 500,
  "foilPrice" = 500,
  "updatedAt" = NOW()
WHERE rarity = 'Common'
  AND (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL);

-- Actualizar UNCOMMON
UPDATE public.cards
SET 
  price = 1000,
  "foilPrice" = 1000,
  "updatedAt" = NOW()
WHERE rarity = 'Uncommon'
  AND (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL);

-- Actualizar RARE
UPDATE public.cards
SET 
  price = 2500,
  "foilPrice" = 4000,
  "updatedAt" = NOW()
WHERE rarity = 'Rare'
  AND (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL);

-- Actualizar SUPER RARE
UPDATE public.cards
SET 
  price = 5000,
  "foilPrice" = 8000,
  "updatedAt" = NOW()
WHERE rarity = 'Super Rare'
  AND (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL);

-- Actualizar LEGENDARY
UPDATE public.cards
SET 
  price = 30000,
  "foilPrice" = 50000,
  "updatedAt" = NOW()
WHERE rarity = 'Legendary'
  AND (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver cuántas cartas se actualizaron por rareza
SELECT 
  rarity,
  COUNT(*) as cartas_actualizadas,
  MIN(price) as precio_min,
  MAX(price) as precio_max
FROM public.cards
WHERE "updatedAt" > NOW() - INTERVAL '1 minute'
GROUP BY rarity
ORDER BY 
  CASE rarity
    WHEN 'Common' THEN 1
    WHEN 'Uncommon' THEN 2
    WHEN 'Rare' THEN 3
    WHEN 'Super Rare' THEN 4
    WHEN 'Legendary' THEN 5
  END;

-- Ver algunas cartas actualizadas como ejemplo
SELECT 
  name,
  rarity,
  price as precio_normal,
  "foilPrice" as precio_foil,
  "normalStock",
  "foilStock"
FROM public.cards
WHERE "updatedAt" > NOW() - INTERVAL '1 minute'
LIMIT 20;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- ✅ Este script es SEGURO:
--    - Solo actualiza cartas sin precio
--    - No toca precios existentes
--    - No modifica stock
--    - Puedes ejecutarlo múltiples veces sin problema
--
-- 📝 Después de ejecutar:
--    - Ve al admin panel: /admin/inventory
--    - Revisa las cartas actualizadas
--    - Ajusta precios manualmente según:
--      * Demanda local
--      * Condición de la carta
--      * Competencia
--      * Set (ediciones limitadas)
--
-- 🔄 Si quieres REVERTIR:
--    Ejecuta:
--    UPDATE public.cards 
--    SET price = 0, "foilPrice" = 0 
--    WHERE "updatedAt" > 'FECHA_QUE_EJECUTASTE';
--
-- ============================================

