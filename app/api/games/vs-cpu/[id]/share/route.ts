import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { getUserAccess } from "@/lib/subscription-access"

export const dynamic = "force-dynamic"

function secureJson(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init)
  res.headers.set("Cache-Control", "private, no-store, max-age=0")
  res.headers.set("Pragma", "no-cache")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  return res
}

async function writeAuditLog(params: {
  sessionId?: string | null
  userId?: string | null
  eventType: string
  token?: string | null
  ip?: string | null
  userAgent?: string | null
  meta?: Record<string, unknown>
}) {
  if (!supabaseAdmin) return
  try {
    await supabaseAdmin.from("vs_cpu_share_audit_logs").insert({
      session_id: params.sessionId ?? null,
      user_id: params.userId ?? null,
      event_type: params.eventType,
      token: params.token ?? null,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      meta: params.meta ?? null,
    })
  } catch (e) {
    console.error("share audit log insert failed:", e)
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return secureJson({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return secureJson({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const access = await getUserAccess(auth.userId)
  if (!access.isPro) {
    return secureJson(
      {
        success: false,
        code: "PRO_REQUIRED_REPLAY_SHARE",
        error: "Compartir replay por link es una función Pro. Suscríbete para habilitarla.",
        data: { isPro: false, source: access.source },
      },
      { status: 403 }
    )
  }

  const params = await context.params
  const id = String(params?.id || "").trim()
  if (!id) return secureJson({ success: false, error: "Missing id" }, { status: 400 })

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

  if (sessionErr) return secureJson({ success: false, error: sessionErr.message }, { status: 500 })
  if (!sessionRow) return secureJson({ success: false, error: "Session not found" }, { status: 404 })

  const token = regenerate ? crypto.randomUUID() : (sessionRow.share_token || crypto.randomUUID())
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
  const { error: upErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .update({ share_token: token, is_public: true, share_expires_at: expiresAt })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (upErr) return secureJson({ success: false, error: upErr.message }, { status: 500 })

  await writeAuditLog({
    sessionId: sessionRow.id,
    userId: auth.userId,
    eventType: regenerate ? "share_regenerated" : "share_created",
    token,
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
    meta: { ttlDays, expiresAt },
  })

  return secureJson({
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
    return secureJson({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return secureJson({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const id = String(params?.id || "").trim()
  if (!id) return secureJson({ success: false, error: "Missing id" }, { status: 400 })

  const { error: upErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .update({ is_public: false, share_expires_at: null })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (upErr) return secureJson({ success: false, error: upErr.message }, { status: 500 })
  await writeAuditLog({
    sessionId: id,
    userId: auth.userId,
    eventType: "share_revoked",
    ip: _request.headers.get("x-forwarded-for") || _request.headers.get("x-real-ip"),
    userAgent: _request.headers.get("user-agent"),
  })
  return secureJson({ success: true })
}
