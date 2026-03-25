-- ============================================
-- VS CPU TUTOR FIELDS (correcto/incorrecto)
-- ============================================

ALTER TABLE public.vs_cpu_game_turns
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'play', -- play | pass | illegal_attempt
  ADD COLUMN IF NOT EXISTS is_legal BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS illegal_reason TEXT,
  ADD COLUMN IF NOT EXISTS ink_before INTEGER,
  ADD COLUMN IF NOT EXISTS ink_cost INTEGER,
  ADD COLUMN IF NOT EXISTS ink_used INTEGER;

-- Helpful index for filtering by legality in admin/tools
CREATE INDEX IF NOT EXISTS idx_vs_cpu_turns_session_legal
  ON public.vs_cpu_game_turns(session_id, is_legal);

