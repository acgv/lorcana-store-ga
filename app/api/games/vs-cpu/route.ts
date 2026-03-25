import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const { data, error } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, deck_id, deck_name, mode, result, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("vs-cpu sessions GET:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}

