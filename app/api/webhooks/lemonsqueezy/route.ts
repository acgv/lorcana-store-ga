import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyLemonSqueezySignature } from "@/lib/lemon-webhook"

export const dynamic = "force-dynamic"

/**
 * Webhook Lemon Squeezy. Configurar URL pública y signing secret en el panel LS.
 * Env: LEMON_SQUEEZY_WEBHOOK_SECRET
 *
 * En el checkout, incluir custom_data con user_id (Supabase) para vincular sin depender solo del email.
 * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error("LEMON_SQUEEZY_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("X-Signature")

  if (!verifyLemonSqueezySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: Record<string, unknown> }
    data?: {
      type?: string
      id?: string | number
      attributes?: Record<string, unknown>
    }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const data = payload.data
  if (!data || data.type !== "subscriptions" || data.id == null) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const attrs = data.attributes || {}
  const subId = String(data.id)
  const userEmailRaw = attrs.user_email
  const userEmail =
    typeof userEmailRaw === "string" && userEmailRaw.trim()
      ? userEmailRaw.trim().toLowerCase()
      : null

  const customUserId = payload.meta?.custom_data?.user_id
  let resolvedUserId: string | null = null
  if (typeof customUserId === "string" && customUserId.length > 0) {
    resolvedUserId = customUserId
  }

  const { data: existing } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("lemonsqueezy_subscription_id", subId)
    .maybeSingle()

  const renewsAt = attrs.renews_at
  const endsAt = attrs.ends_at
  const periodEnd =
    typeof renewsAt === "string"
      ? renewsAt
      : typeof endsAt === "string"
        ? endsAt
        : null

  const row = {
    lemonsqueezy_subscription_id: subId,
    lemonsqueezy_customer_id: attrs.customer_id != null ? String(attrs.customer_id) : null,
    status: typeof attrs.status === "string" ? attrs.status : "unknown",
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(attrs.cancelled),
    user_email: userEmail,
    user_id: resolvedUserId ?? existing?.user_id ?? null,
    last_event: payload as unknown as Record<string, unknown>,
  }

  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(row, {
    onConflict: "lemonsqueezy_subscription_id",
  })

  if (error) {
    console.error("user_subscriptions upsert:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
