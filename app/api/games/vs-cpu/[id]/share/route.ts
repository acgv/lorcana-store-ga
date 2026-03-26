import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const id = String(params?.id || "").trim()
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })

  let body: { ttlDays?: number; regenerate?: boolean } = {}
  try {
    body = (await request.json()) as { ttlDays?: number; regenerate?: boolean }
  } catch {
    body = {}
  }

  const ttlDaysRaw = Number(body.ttlDays ?? 7)
  const ttlDays = Number.isFinite(ttlDaysRaw) && ttlDaysRaw > 0 && ttlDaysRaw <= 365 ? Math.floor(ttlDaysRaw) : 7
  const regenerate = Boolean(body.regenerate)

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, share_token, is_public, share_expires_at")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (sessionErr) return NextResponse.json({ success: false, error: sessionErr.message }, { status: 500 })
  if (!sessionRow) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })

  const token = regenerate ? crypto.randomUUID() : (sessionRow.share_token || crypto.randomUUID())
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
  const { error: upErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .update({ share_token: token, is_public: true, share_expires_at: expiresAt })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    data: {
      token,
      url: `/lorcana-tcg/replay/share/${token}`,
      expiresAt,
      ttlDays,
    },
  })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifySupabaseSession(_request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const id = String(params?.id || "").trim()
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })

  const { error: upErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .update({ is_public: false, share_expires_at: null })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
