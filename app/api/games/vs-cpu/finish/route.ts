import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type Mode = "manual" | "auto"
type Result = "player" | "cpu"

type TurnPayload = {
  turnIndex: number
  action: "play" | "pass" | "illegal_attempt"
  isLegal: boolean
  reason?: string | null
  inkBefore?: number
  inkCost?: number
  inkUsed?: number

  playerCardId?: string | null
  playerCardName?: string | null
  playerLoreGain?: number
  cpuCardId?: string | null
  cpuCardName?: string | null
  cpuLoreGain?: number
}

type FinishPayload = {
  deckId: string
  deckName: string
  mode: Mode
  result: Result
  turns: TurnPayload[]
}

function isMode(v: unknown): v is Mode {
  return v === "manual" || v === "auto"
}

function isResult(v: unknown): v is Result {
  return v === "player" || v === "cpu"
}

function isAction(v: unknown): v is TurnPayload["action"] {
  return v === "play" || v === "pass" || v === "illegal_attempt"
}

export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  let body: FinishPayload
  try {
    body = (await request.json()) as FinishPayload
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const deckId = String(body.deckId || "").trim()
  const deckName = String(body.deckName || "").trim()
  const mode = body.mode
  const result = body.result
  const turns = Array.isArray(body.turns) ? body.turns : []

  if (!deckId) {
    return NextResponse.json({ success: false, error: "deckId is required" }, { status: 400 })
  }
  if (!deckName) {
    return NextResponse.json({ success: false, error: "deckName is required" }, { status: 400 })
  }
  if (!isMode(mode)) {
    return NextResponse.json({ success: false, error: "mode must be manual|auto" }, { status: 400 })
  }
  if (!isResult(result)) {
    return NextResponse.json({ success: false, error: "result must be player|cpu" }, { status: 400 })
  }
  if (turns.length === 0) {
    return NextResponse.json({ success: false, error: "turns must be non-empty" }, { status: 400 })
  }

  const safeTurns = turns
    .map((t) => {
      const turnIndex = Math.floor(Number(t.turnIndex))
      const action = t.action
      const isLegal = Boolean(t.isLegal)

      const inkBefore = t.inkBefore == null ? null : Math.floor(Number(t.inkBefore))
      const inkCost = t.inkCost == null ? null : Math.floor(Number(t.inkCost))
      const inkUsed = t.inkUsed == null ? null : Math.floor(Number(t.inkUsed))

      const reason = t.reason == null ? null : String(t.reason)

      const playerLoreGain = t.playerLoreGain == null ? 0 : Math.floor(Number(t.playerLoreGain))
      const cpuLoreGain = t.cpuLoreGain == null ? 0 : Math.floor(Number(t.cpuLoreGain))

      const playerCardId = t.playerCardId == null ? null : String(t.playerCardId).trim() || null
      const playerCardName = t.playerCardName == null ? null : String(t.playerCardName).trim() || null
      const cpuCardId = t.cpuCardId == null ? null : String(t.cpuCardId).trim() || null
      const cpuCardName = t.cpuCardName == null ? null : String(t.cpuCardName).trim() || null

      if (!isAction(action)) return null
      if (Number.isNaN(turnIndex)) return null
      if (Number.isNaN(playerLoreGain) || Number.isNaN(cpuLoreGain)) return null

      // Reglas mínimas por tipo de acción
      if (action === "play") {
        if (!playerCardId || !playerCardName || !cpuCardId || !cpuCardName) return null
      }
      if (action === "illegal_attempt") {
        if (!playerCardId || !playerCardName) return null
      }

      return {
        turn_index: turnIndex,
        action,
        is_legal: isLegal,
        illegal_reason: reason,
        ink_before: inkBefore,
        ink_cost: inkCost,
        ink_used: inkUsed,
        player_card_id: playerCardId,
        player_card_name: playerCardName,
        player_lore_gain: playerLoreGain,
        cpu_card_id: cpuCardId,
        cpu_card_name: cpuCardName,
        cpu_lore_gain: cpuLoreGain,
      }
    })
    .filter(Boolean) as any[]

  if (safeTurns.length === 0) {
    return NextResponse.json({ success: false, error: "Invalid turns payload" }, { status: 400 })
  }

  // 1) Crear sesión
  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .insert({
      user_id: auth.userId,
      deck_id: deckId,
      deck_name: deckName,
      mode,
      result,
    })
    .select("id")
    .single()

  if (sessionErr || !sessionRow?.id) {
    console.error("vs_cpu_game_sessions insert:", sessionErr)
    return NextResponse.json({ success: false, error: sessionErr?.message || "Failed to create session" }, { status: 500 })
  }

  // 2) Insertar turnos
  const { error: turnsErr } = await supabaseAdmin.from("vs_cpu_game_turns").insert(
    safeTurns.map((t) => ({
      ...t,
      session_id: sessionRow.id,
    }))
  )

  if (turnsErr) {
    console.error("vs_cpu_game_turns insert:", turnsErr)
    return NextResponse.json({ success: false, error: turnsErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { id: sessionRow.id },
  })
}

