-- Daily Challenge (MVP): reto diario + intentos por usuario

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_challenge ON public.daily_challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_user ON public.daily_challenge_attempts(user_id);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Lectura abierta para retos (si en el futuro quieres mostrarlo sin login).
DROP POLICY IF EXISTS "daily_challenges_select_all" ON public.daily_challenges;
CREATE POLICY "daily_challenges_select_all"
  ON public.daily_challenges
  FOR SELECT
  TO authenticated
  USING (true);

-- Intentos: cada usuario ve/crea/actualiza solo los suyos.
DROP POLICY IF EXISTS "daily_attempts_select_own" ON public.daily_challenge_attempts;
CREATE POLICY "daily_attempts_select_own"
  ON public.daily_challenge_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_attempts_insert_own" ON public.daily_challenge_attempts;
CREATE POLICY "daily_attempts_insert_own"
  ON public.daily_challenge_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_attempts_update_own" ON public.daily_challenge_attempts;
CREATE POLICY "daily_attempts_update_own"
  ON public.daily_challenge_attempts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
