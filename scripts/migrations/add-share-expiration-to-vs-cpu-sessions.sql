ALTER TABLE public.vs_cpu_game_sessions
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vs_cpu_game_sessions_share_expires_at
  ON public.vs_cpu_game_sessions(share_expires_at);
