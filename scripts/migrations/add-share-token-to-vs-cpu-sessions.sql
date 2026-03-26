ALTER TABLE public.vs_cpu_game_sessions
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vs_cpu_game_sessions_share_token
  ON public.vs_cpu_game_sessions(share_token);
