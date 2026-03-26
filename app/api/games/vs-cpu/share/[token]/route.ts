import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const token = String(params?.token || "").trim()
  if (!token) return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 })

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, deck_name, mode, result, created_at, share_token, is_public, share_expires_at")
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle()

  if (sessionErr) return NextResponse.json({ success: false, error: sessionErr.message }, { status: 500 })
  if (!sessionRow) return NextResponse.json({ success: false, error: "Replay not found" }, { status: 404 })
  if (sessionRow.share_expires_at) {
    const expiresMs = new Date(sessionRow.share_expires_at).getTime()
    if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
      return NextResponse.json({ success: false, error: "Replay link expired" }, { status: 410 })
    }
  }

  const { data: turns, error: turnsErr } = await supabaseAdmin
    .from("vs_cpu_game_turns")
    .select("turn_index, engine_actor, engine_action, engine_events, action, is_legal, illegal_reason, player_lore_gain, cpu_lore_gain, player_card_name, cpu_card_name")
    .eq("session_id", sessionRow.id)
    .order("turn_index", { ascending: true })

  if (turnsErr) return NextResponse.json({ success: false, error: turnsErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    data: {
      session: sessionRow,
      turns: turns || [],
    },
  })
}
