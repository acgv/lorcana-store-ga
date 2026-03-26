CREATE TABLE IF NOT EXISTS public.vs_cpu_share_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.vs_cpu_game_sessions(id) ON DELETE SET NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  token TEXT,
  ip TEXT,
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_share_audit_logs_session_id
  ON public.vs_cpu_share_audit_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_share_audit_logs_event_type
  ON public.vs_cpu_share_audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_vs_cpu_share_audit_logs_created_at
  ON public.vs_cpu_share_audit_logs(created_at);
