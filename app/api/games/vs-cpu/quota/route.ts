import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { getUserAccess } from "@/lib/subscription-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const access = await getUserAccess(auth.userId)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { count, error } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", auth.userId)
    .gte("created_at", startOfDay.toISOString())

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const todayGames = Number(count || 0)
  const maxDailyGames = access.maxDailyGames
  const remainingDailyGames = maxDailyGames == null ? null : Math.max(0, maxDailyGames - todayGames)

  return NextResponse.json({
    success: true,
    data: {
      access,
      todayGames,
      maxDailyGames,
      remainingDailyGames,
    },
  })
}
