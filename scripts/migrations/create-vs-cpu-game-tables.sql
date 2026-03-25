-- ============================================
-- VS CPU GAME REPLAYS
-- ============================================
-- Persiste el resultado y el detalle por turno
-- para que el usuario pueda ver qué jugó y
-- qué eligió la CPU después de terminar la partida.
--
-- Run in Supabase SQL Editor.
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sesiones de partida (1 por replay)
CREATE TABLE IF NOT EXISTS public.vs_cpu_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id TEXT,
  deck_name TEXT,
  mode TEXT NOT NULL DEFAULT 'manual', -- manual | auto
  result TEXT NOT NULL, -- player | cpu
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_sessions_user_id
  ON public.vs_cpu_game_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_sessions_created_at
  ON public.vs_cpu_game_sessions(created_at DESC);

ALTER TABLE public.vs_cpu_game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vs-cpu sessions" ON public.vs_cpu_game_sessions;
CREATE POLICY "Users can view own vs-cpu sessions"
ON public.vs_cpu_game_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_vs_cpu_sessions_updated_at ON public.vs_cpu_game_sessions;
CREATE TRIGGER update_vs_cpu_sessions_updated_at
  BEFORE UPDATE ON public.vs_cpu_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Turns detallados
CREATE TABLE IF NOT EXISTS public.vs_cpu_game_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.vs_cpu_game_sessions(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  player_card_id TEXT,
  player_card_name TEXT,
  player_lore_gain INTEGER NOT NULL DEFAULT 0,
  cpu_card_id TEXT,
  cpu_card_name TEXT,
  cpu_lore_gain INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_turns_session_id
  ON public.vs_cpu_game_turns(session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vs_cpu_turns_session_turn
  ON public.vs_cpu_game_turns(session_id, turn_index);

ALTER TABLE public.vs_cpu_game_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vs-cpu turns" ON public.vs_cpu_game_turns;
CREATE POLICY "Users can view own vs-cpu turns"
ON public.vs_cpu_game_turns FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vs_cpu_game_sessions s
    WHERE s.id = session_id
      AND s.user_id = auth.uid()
  )
);

