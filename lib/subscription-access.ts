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

  const { data: subRows } = await supabaseAdmin
    .from("user_subscriptions")
    .select("status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)

  const status = String(subRows?.[0]?.status || "")
  const isPro = ACTIVE_LIKE.has(status)
  return {
    isPro,
    source: isPro ? "subscription" : "free",
    maxDecks: isPro ? null : 2,
    maxDailyGames: isPro ? null : 3,
  }
}
