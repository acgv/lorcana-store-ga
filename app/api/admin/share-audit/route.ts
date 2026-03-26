import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status || 401 })
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const url = new URL(request.url)
    const eventType = String(url.searchParams.get("eventType") || "").trim()
    const limitRaw = Number(url.searchParams.get("limit") || 100)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 100

    let q = supabaseAdmin
      .from("vs_cpu_share_audit_logs")
      .select("id, session_id, user_id, event_type, token, ip, user_agent, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (eventType) q = q.eq("event_type", eventType)

    const { data, error } = await q
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
