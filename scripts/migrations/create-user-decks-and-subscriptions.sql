-- ============================================
-- USER DECKS + SUBSCRIPTIONS (Lemon Squeezy)
-- ============================================
-- Run in Supabase SQL Editor after other migrations.
-- Requires: update_updated_at_column() (see create-user-profile-tables.sql)
-- ============================================

-- Mazos persistidos (fuente de verdad para juego online / multi-dispositivo)
CREATE TABLE IF NOT EXISTS public.user_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_decks_cards_is_array CHECK (jsonb_typeof(cards) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_user_decks_user_id ON public.user_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_user_updated ON public.user_decks(user_id, updated_at DESC);

ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own decks" ON public.user_decks;
CREATE POLICY "Users select own decks"
ON public.user_decks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own decks" ON public.user_decks;
CREATE POLICY "Users insert own decks"
ON public.user_decks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own decks" ON public.user_decks;
CREATE POLICY "Users update own decks"
ON public.user_decks FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own decks" ON public.user_decks;
CREATE POLICY "Users delete own decks"
ON public.user_decks FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_decks_updated_at ON public.user_decks;
CREATE TRIGGER update_user_decks_updated_at
  BEFORE UPDATE ON public.user_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Suscripciones (webhook Lemon Squeezy escribe con service role; el usuario solo lee la suya)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  lemonsqueezy_subscription_id TEXT UNIQUE,
  lemonsqueezy_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  last_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_email ON public.user_subscriptions(user_email);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own subscription" ON public.user_subscriptions;
CREATE POLICY "Users select own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
