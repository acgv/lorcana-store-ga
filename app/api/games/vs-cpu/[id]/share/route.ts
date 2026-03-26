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

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, share_token, is_public")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (sessionErr) return NextResponse.json({ success: false, error: sessionErr.message }, { status: 500 })
  if (!sessionRow) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })

  const token = sessionRow.share_token || crypto.randomUUID()
  const { error: upErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .update({ share_token: token, is_public: true })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    data: {
      token,
      url: `/lorcana-tcg/replay/share/${token}`,
    },
  })
}
