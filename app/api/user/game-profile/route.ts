import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { computeXp, evaluateBadges, type PlayerGameStats } from "@/lib/lorcana-badges"

export const dynamic = "force-dynamic"

type SessionRow = {
  id: string
  result: "player" | "cpu"
  created_at: string
}

function safeWinRate(wins: number, total: number) {
  if (!total) return 0
  return Math.round((wins / total) * 100)
}

function computeBestWinStreak(sessions: SessionRow[]) {
  let best = 0
  let current = 0
  for (const s of sessions) {
    if (s.result === "player") {
      current += 1
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return best
}

export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  try {
    const { data: sessionsRaw, error: sessionsErr } = await supabaseAdmin
      .from("vs_cpu_game_sessions")
      .select("id, result, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true })

    if (sessionsErr) throw sessionsErr
    const sessions = (sessionsRaw || []) as SessionRow[]
    const totalGames = sessions.length
    const wins = sessions.filter((s) => s.result === "player").length
    const bestWinStreak = computeBestWinStreak(sessions)
    const sessionIds = sessions.map((s) => s.id)

    let inkedCards = 0
    if (sessionIds.length > 0) {
      const { data: turns, error: turnsErr } = await supabaseAdmin
        .from("vs_cpu_game_turns")
        .select("engine_actor, engine_action")
        .in("session_id", sessionIds)
      if (!turnsErr) {
        inkedCards = (turns || []).filter((t: any) => {
          const actor = t?.engine_actor
          const type = t?.engine_action?.type
          return actor === "player" && type === "INK_FROM_HAND"
        }).length
      }
    }

    let dailyCorrect = 0
    const { count: dailyCount, error: dailyErr } = await supabaseAdmin
      .from("daily_challenge_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("is_correct", true)
    if (!dailyErr) dailyCorrect = dailyCount || 0

    const baseStats = {
      totalGames,
      wins,
      winRate: safeWinRate(wins, totalGames),
      bestWinStreak,
      inkedCards,
      dailyCorrect,
    }
    const xpInfo = computeXp(baseStats)
    const stats: PlayerGameStats = {
      ...baseStats,
      xp: xpInfo.xp,
      level: xpInfo.level,
    }
    const badges = evaluateBadges(stats)

    return NextResponse.json({
      success: true,
      data: {
        stats,
        badges,
      },
    })
  } catch (e) {
    console.error("game-profile GET:", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 })
  }
}
