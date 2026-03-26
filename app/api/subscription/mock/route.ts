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

  const { data } = await supabaseAdmin
    .from("user_subscription_mocks")
    .select("mode, updated_at")
    .eq("user_id", auth.userId)
    .maybeSingle()

  const access = await getUserAccess(auth.userId)
  return NextResponse.json({
    success: true,
    data: {
      mode: data?.mode || null,
      updatedAt: data?.updated_at || null,
      access,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  let body: { mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const mode = String(body.mode || "").trim().toLowerCase()
  if (mode !== "free" && mode !== "pro" && mode !== "off") {
    return NextResponse.json({ success: false, error: "mode must be free|pro|off" }, { status: 400 })
  }

  if (mode === "off") {
    await supabaseAdmin.from("user_subscription_mocks").delete().eq("user_id", auth.userId)
  } else {
    const { error } = await supabaseAdmin.from("user_subscription_mocks").upsert(
      { user_id: auth.userId, mode, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  const access = await getUserAccess(auth.userId)
  return NextResponse.json({ success: true, data: { mode: mode === "off" ? null : mode, access } })
}
