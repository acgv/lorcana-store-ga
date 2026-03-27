-- ============================================
-- Migración: Normalizar set IDs a valores nativos de la API
-- Cambia los valores legacy (camelCase) a los Set_ID de la API (lowercase 3 letras)
-- Esto permite que el import sea 100% automático sin mapeos manuales
-- ============================================
-- IMPORTANTE: Ejecutar en orden. Hacer backup antes.
-- ============================================

BEGIN;

-- =============================================
-- 1. Tabla: cards — columna "set"
-- =============================================
UPDATE public.cards SET "set" = 'tfc' WHERE "set" = 'firstChapter';
UPDATE public.cards SET "set" = 'rof' WHERE "set" = 'riseOfFloodborn';
UPDATE public.cards SET "set" = 'ink' WHERE "set" = 'intoInklands';
UPDATE public.cards SET "set" = 'urs' WHERE "set" = 'ursulaReturn';
UPDATE public.cards SET "set" = 'ssk' WHERE "set" = 'shimmering';
UPDATE public.cards SET "set" = 'azs' WHERE "set" = 'azurite';
UPDATE public.cards SET "set" = 'ari' WHERE "set" = 'archazia';
UPDATE public.cards SET "set" = 'roj' WHERE "set" = 'reignOfJafar';
UPDATE public.cards SET "set" = 'fab' WHERE "set" = 'fabled';
UPDATE public.cards SET "set" = 'whi' WHERE "set" = 'whispersInTheWell';
UPDATE public.cards SET "set" = 'win' WHERE "set" = 'winterspell';

-- =============================================
-- 2. Tabla: cards — columna "id" (incluye set como prefijo)
-- =============================================
UPDATE public.cards SET id = REPLACE(id, 'firstChapter-', 'tfc-') WHERE id LIKE 'firstChapter-%';
UPDATE public.cards SET id = REPLACE(id, 'riseOfFloodborn-', 'rof-') WHERE id LIKE 'riseOfFloodborn-%';
UPDATE public.cards SET id = REPLACE(id, 'intoInklands-', 'ink-') WHERE id LIKE 'intoInklands-%';
UPDATE public.cards SET id = REPLACE(id, 'ursulaReturn-', 'urs-') WHERE id LIKE 'ursulaReturn-%';
UPDATE public.cards SET id = REPLACE(id, 'shimmering-', 'ssk-') WHERE id LIKE 'shimmering-%';
UPDATE public.cards SET id = REPLACE(id, 'azurite-', 'azs-') WHERE id LIKE 'azurite-%';
UPDATE public.cards SET id = REPLACE(id, 'archazia-', 'ari-') WHERE id LIKE 'archazia-%';
UPDATE public.cards SET id = REPLACE(id, 'reignOfJafar-', 'roj-') WHERE id LIKE 'reignOfJafar-%';
UPDATE public.cards SET id = REPLACE(id, 'fabled-', 'fab-') WHERE id LIKE 'fabled-%';
UPDATE public.cards SET id = REPLACE(id, 'whispersInTheWell-', 'whi-') WHERE id LIKE 'whispersInTheWell-%';
UPDATE public.cards SET id = REPLACE(id, 'winterspell-', 'win-') WHERE id LIKE 'winterspell-%';

-- =============================================
-- 3. Tabla: user_collections — columna "card_id"
-- =============================================
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'firstChapter-', 'tfc-') WHERE card_id LIKE 'firstChapter-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'riseOfFloodborn-', 'rof-') WHERE card_id LIKE 'riseOfFloodborn-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'intoInklands-', 'ink-') WHERE card_id LIKE 'intoInklands-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'ursulaReturn-', 'urs-') WHERE card_id LIKE 'ursulaReturn-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'shimmering-', 'ssk-') WHERE card_id LIKE 'shimmering-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'azurite-', 'azs-') WHERE card_id LIKE 'azurite-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'archazia-', 'ari-') WHERE card_id LIKE 'archazia-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'reignOfJafar-', 'roj-') WHERE card_id LIKE 'reignOfJafar-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'fabled-', 'fab-') WHERE card_id LIKE 'fabled-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'whispersInTheWell-', 'whi-') WHERE card_id LIKE 'whispersInTheWell-%';
UPDATE public.user_collections SET card_id = REPLACE(card_id, 'winterspell-', 'win-') WHERE card_id LIKE 'winterspell-%';

-- =============================================
-- 4. Tabla: user_decks — columna "cards" (JSONB array con card IDs)
-- =============================================
UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'firstChapter-', 'tfc-')::jsonb
WHERE cards::text LIKE '%firstChapter-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'riseOfFloodborn-', 'rof-')::jsonb
WHERE cards::text LIKE '%riseOfFloodborn-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'intoInklands-', 'ink-')::jsonb
WHERE cards::text LIKE '%intoInklands-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'ursulaReturn-', 'urs-')::jsonb
WHERE cards::text LIKE '%ursulaReturn-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'shimmering-', 'ssk-')::jsonb
WHERE cards::text LIKE '%shimmering-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'azurite-', 'azs-')::jsonb
WHERE cards::text LIKE '%azurite-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'archazia-', 'ari-')::jsonb
WHERE cards::text LIKE '%archazia-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'reignOfJafar-', 'roj-')::jsonb
WHERE cards::text LIKE '%reignOfJafar-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'fabled-', 'fab-')::jsonb
WHERE cards::text LIKE '%fabled-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'whispersInTheWell-', 'whi-')::jsonb
WHERE cards::text LIKE '%whispersInTheWell-%';

UPDATE public.user_decks
SET cards = REPLACE(cards::text, 'winterspell-', 'win-')::jsonb
WHERE cards::text LIKE '%winterspell-%';

-- =============================================
-- 5. Tabla: vs_cpu_game_turns — columnas player_card_id y cpu_card_id
-- =============================================
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'firstChapter-', 'tfc-') WHERE player_card_id LIKE 'firstChapter-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'riseOfFloodborn-', 'rof-') WHERE player_card_id LIKE 'riseOfFloodborn-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'intoInklands-', 'ink-') WHERE player_card_id LIKE 'intoInklands-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'ursulaReturn-', 'urs-') WHERE player_card_id LIKE 'ursulaReturn-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'shimmering-', 'ssk-') WHERE player_card_id LIKE 'shimmering-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'azurite-', 'azs-') WHERE player_card_id LIKE 'azurite-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'archazia-', 'ari-') WHERE player_card_id LIKE 'archazia-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'reignOfJafar-', 'roj-') WHERE player_card_id LIKE 'reignOfJafar-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'fabled-', 'fab-') WHERE player_card_id LIKE 'fabled-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'whispersInTheWell-', 'whi-') WHERE player_card_id LIKE 'whispersInTheWell-%';
UPDATE public.vs_cpu_game_turns SET player_card_id = REPLACE(player_card_id, 'winterspell-', 'win-') WHERE player_card_id LIKE 'winterspell-%';

UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'firstChapter-', 'tfc-') WHERE cpu_card_id LIKE 'firstChapter-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'riseOfFloodborn-', 'rof-') WHERE cpu_card_id LIKE 'riseOfFloodborn-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'intoInklands-', 'ink-') WHERE cpu_card_id LIKE 'intoInklands-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'ursulaReturn-', 'urs-') WHERE cpu_card_id LIKE 'ursulaReturn-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'shimmering-', 'ssk-') WHERE cpu_card_id LIKE 'shimmering-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'azurite-', 'azs-') WHERE cpu_card_id LIKE 'azurite-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'archazia-', 'ari-') WHERE cpu_card_id LIKE 'archazia-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'reignOfJafar-', 'roj-') WHERE cpu_card_id LIKE 'reignOfJafar-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'fabled-', 'fab-') WHERE cpu_card_id LIKE 'fabled-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'whispersInTheWell-', 'whi-') WHERE cpu_card_id LIKE 'whispersInTheWell-%';
UPDATE public.vs_cpu_game_turns SET cpu_card_id = REPLACE(cpu_card_id, 'winterspell-', 'win-') WHERE cpu_card_id LIKE 'winterspell-%';

COMMIT;

-- ============================================
-- Verificación post-migración
-- ============================================
-- Ejecutar después del COMMIT para confirmar que no quedan valores legacy:

-- SELECT DISTINCT "set" FROM public.cards ORDER BY "set";
-- SELECT DISTINCT LEFT(id, POSITION('-' IN id) - 1) AS prefix FROM public.cards ORDER BY prefix;
-- SELECT DISTINCT LEFT(card_id, POSITION('-' IN card_id) - 1) AS prefix FROM public.user_collections ORDER BY prefix;
