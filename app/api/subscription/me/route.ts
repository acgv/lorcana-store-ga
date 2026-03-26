import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { getUserAccess } from "@/lib/subscription-access"

export const dynamic = "force-dynamic"

const ACTIVE_LIKE = new Set(["active", "on_trial", "paused", "past_due"])

/**
 * Estado de suscripción Lemon Squeezy para el usuario autenticado.
 * Vincula por user_id o, si falta, por email (tras webhook).
 */
export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const email = auth.email?.toLowerCase().trim() || null

  if (email) {
    const { data: orphans } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id")
      .eq("user_email", email)
      .is("user_id", null)
      .limit(5)

    if (orphans?.length) {
      for (const o of orphans) {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({ user_id: auth.userId })
          .eq("id", o.id)
      }
    }
  }

  const { data: rows, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select(
      "id, user_id, user_email, lemonsqueezy_subscription_id, status, current_period_end, cancel_at_period_end, updated_at"
    )
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("subscription/me:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const row = rows?.[0] ?? null
  const status = row?.status ?? null
  const active = status != null && ACTIVE_LIKE.has(String(status))
  const access = await getUserAccess(auth.userId)

  return NextResponse.json({
    success: true,
    data: {
      active,
      subscription: row,
      access,
    },
  })
}
