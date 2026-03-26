import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { getUserAccess } from "@/lib/subscription-access"

export const dynamic = "force-dynamic"

type Result = "player" | "cpu"
type Actor = "player" | "cpu" | "system"

type EngineTurnPayload = {
  index: number
  actor: Actor
  action: unknown
  events: unknown[]
}

type FinishEnginePayload = {
  deckId: string
  deckName: string
  result: Result
  engineTurns: EngineTurnPayload[]
}

function isResult(v: unknown): v is Result {
  return v === "player" || v === "cpu"
}

function isActor(v: unknown): v is Actor {
  return v === "player" || v === "cpu" || v === "system"
}

export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  let body: FinishEnginePayload
  try {
    body = (await request.json()) as FinishEnginePayload
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const deckId = String(body.deckId || "").trim()
  const deckName = String(body.deckName || "").trim()
  const result = body.result
  const engineTurns = Array.isArray(body.engineTurns) ? body.engineTurns : []

  if (!deckId) return NextResponse.json({ success: false, error: "deckId is required" }, { status: 400 })
  if (!deckName) return NextResponse.json({ success: false, error: "deckName is required" }, { status: 400 })
  if (!isResult(result)) return NextResponse.json({ success: false, error: "result must be player|cpu" }, { status: 400 })
  if (engineTurns.length === 0) {
    return NextResponse.json({ success: false, error: "engineTurns must be non-empty" }, { status: 400 })
  }

  const safeTurns = engineTurns
    .map((t) => {
      const index = Math.floor(Number(t.index))
      if (!Number.isFinite(index) || index < 1) return null
      if (!isActor(t.actor)) return null
      const events = Array.isArray(t.events) ? t.events : []
      return {
        turn_index: index,
        engine_actor: t.actor,
        engine_action: t.action ?? null,
        engine_events: events,
        // Legacy fields (para compatibilidad UI antigua)
        action: "play",
        is_legal: true,
        player_lore_gain: 0,
        cpu_lore_gain: 0,
      }
    })
    .filter(Boolean) as any[]

  if (safeTurns.length === 0) {
    return NextResponse.json({ success: false, error: "Invalid engineTurns payload" }, { status: 400 })
  }

  const access = await getUserAccess(auth.userId)
  if (!access.isPro && access.maxDailyGames != null) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { count, error: countErr } = await supabaseAdmin
      .from("vs_cpu_game_sessions")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", auth.userId)
      .gte("created_at", startOfDay.toISOString())
    if (countErr) {
      return NextResponse.json({ success: false, error: countErr.message }, { status: 500 })
    }
    const todayGames = Number(count || 0)
    if (todayGames >= access.maxDailyGames) {
      return NextResponse.json(
        {
          success: false,
          code: "FREE_DAILY_GAMES_LIMIT_REACHED",
          error: `Plan Free: máximo ${access.maxDailyGames} partidas por día. Suscríbete para ilimitado.`,
          data: { todayGames, maxDailyGames: access.maxDailyGames, isPro: access.isPro },
        },
        { status: 403 }
      )
    }
  }

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .insert({
      user_id: auth.userId,
      deck_id: deckId,
      deck_name: deckName,
      mode: "manual",
      result,
    })
    .select("id")
    .single()

  if (sessionErr || !sessionRow?.id) {
    console.error("finish-engine session insert:", sessionErr)
    return NextResponse.json({ success: false, error: sessionErr?.message || "Failed to create session" }, { status: 500 })
  }

  const { error: turnsErr } = await supabaseAdmin.from("vs_cpu_game_turns").insert(
    safeTurns.map((t) => ({
      ...t,
      session_id: sessionRow.id,
    }))
  )

  if (turnsErr) {
    console.error("finish-engine turns insert:", turnsErr)
    return NextResponse.json({ success: false, error: turnsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { id: sessionRow.id, access } })
}

