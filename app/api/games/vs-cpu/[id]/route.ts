import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

function secureJson(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init)
  res.headers.set("Cache-Control", "private, no-store, max-age=0")
  res.headers.set("Pragma", "no-cache")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  return res
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return secureJson({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return secureJson({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const id = String(params?.id || "").trim()
  if (!id) {
    return secureJson({ success: false, error: "Missing id" }, { status: 400 })
  }

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, deck_id, deck_name, mode, result, created_at, updated_at, is_public, share_expires_at")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (sessionErr) {
    console.error("vs-cpu session GET:", sessionErr)
    return secureJson({ success: false, error: sessionErr.message }, { status: 500 })
  }
  if (!sessionRow) {
    return secureJson({ success: false, error: "Session not found" }, { status: 404 })
  }

  const { data: turns, error: turnsErr } = await supabaseAdmin
    .from("vs_cpu_game_turns")
    .select(
      "turn_index, action, is_legal, illegal_reason, ink_before, ink_cost, ink_used, player_card_id, player_card_name, player_lore_gain, cpu_card_id, cpu_card_name, cpu_lore_gain, engine_actor, engine_action, engine_events"
    )
    .eq("session_id", id)
    .order("turn_index", { ascending: true })

  if (turnsErr) {
    console.error("vs-cpu turns GET:", turnsErr)
    return secureJson({ success: false, error: turnsErr.message }, { status: 500 })
  }

  return secureJson({
    success: true,
    data: {
      session: sessionRow,
      turns: turns || [],
    },
  })
}

