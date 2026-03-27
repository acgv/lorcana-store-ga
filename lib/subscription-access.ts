import { supabaseAdmin } from "@/lib/db"

const ACTIVE_LIKE = new Set(["active", "on_trial", "paused", "past_due"])

export type UserAccess = {
  isPro: boolean
  source: "mock" | "subscription" | "free"
  maxDecks: number | null
  maxDailyGames: number | null
}

export async function getUserAccess(userId: string): Promise<UserAccess> {
  if (!supabaseAdmin) {
    return { isPro: false, source: "free", maxDecks: 2, maxDailyGames: 3 }
  }

  // 1. Suscripción real de Lemon Squeezy (prioridad)
  const { data: subRows } = await supabaseAdmin
    .from("user_subscriptions")
    .select("status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)

  const status = String(subRows?.[0]?.status || "")
  if (ACTIVE_LIKE.has(status)) {
    return { isPro: true, source: "subscription", maxDecks: null, maxDailyGames: null }
  }

  // 2. Mock (solo como fallback para dev/testing)
  const { data: mockRows } = await supabaseAdmin
    .from("user_subscription_mocks")
    .select("mode")
    .eq("user_id", userId)
    .limit(1)

  const mode = String(mockRows?.[0]?.mode || "").toLowerCase()
  if (mode === "pro") return { isPro: true, source: "mock", maxDecks: null, maxDailyGames: null }
  if (mode === "free") return { isPro: false, source: "mock", maxDecks: 2, maxDailyGames: 3 }

  return { isPro: false, source: "free", maxDecks: 2, maxDailyGames: 3 }
}
