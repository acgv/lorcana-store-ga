-- ============================================
-- VS CPU ENGINE REPLAY (motor lorcana-game)
-- ============================================
-- Guarda acciones y eventos del motor como JSONB
-- para replays fieles a las reglas.
--
-- Run in Supabase SQL Editor.
-- ============================================

ALTER TABLE public.vs_cpu_game_turns
  ADD COLUMN IF NOT EXISTS engine_actor TEXT, -- 'player' | 'cpu' | 'system'
  ADD COLUMN IF NOT EXISTS engine_action JSONB,
  ADD COLUMN IF NOT EXISTS engine_events JSONB;

CREATE INDEX IF NOT EXISTS idx_vs_cpu_turns_session_actor
  ON public.vs_cpu_game_turns(session_id, engine_actor);

