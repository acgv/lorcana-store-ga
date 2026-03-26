import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type Bucket = { count: number; resetAt: number }
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}

function checkRateLimit(key: string): boolean {
  const store = (globalThis as any).__shareRateLimitStore as Map<string, Bucket> | undefined
  const map = store ?? new Map<string, Bucket>()
  ;(globalThis as any).__shareRateLimitStore = map

  const now = Date.now()
  const current = map.get(key)
  if (!current || now > current.resetAt) {
    map.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (current.count >= RATE_LIMIT_MAX) return false
  current.count += 1
  map.set(key, current)
  return true
}

function securePublicJson(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init)
  res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30")
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-Content-Type-Options", "nosniff")
  return res
}

async function writeAuditLog(params: {
  sessionId?: string | null
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

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!supabaseAdmin) {
    return securePublicJson({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const params = await context.params
  const token = String(params?.token || "").trim()
  if (!token) return securePublicJson({ success: false, error: "Missing token" }, { status: 400 })
  if (token.length > 128 || !/^[a-zA-Z0-9-]+$/.test(token)) {
    return securePublicJson({ success: false, error: "Invalid token format" }, { status: 400 })
  }

  const ip = getClientIp(request)
  const allowed = checkRateLimit(`${ip}:${token}`)
  if (!allowed) {
    await writeAuditLog({
      eventType: "share_open_rate_limited",
      token,
      ip,
      userAgent: request.headers.get("user-agent"),
    })
    return securePublicJson({ success: false, error: "Too many requests" }, { status: 429 })
  }

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from("vs_cpu_game_sessions")
    .select("id, deck_name, mode, result, created_at, share_token, is_public, share_expires_at")
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle()

  if (sessionErr) return securePublicJson({ success: false, error: sessionErr.message }, { status: 500 })
  if (!sessionRow) {
    await writeAuditLog({
      eventType: "share_open_not_found",
      token,
      ip,
      userAgent: request.headers.get("user-agent"),
    })
    return securePublicJson({ success: false, error: "Replay not found" }, { status: 404 })
  }
  if (sessionRow.share_expires_at) {
    const expiresMs = new Date(sessionRow.share_expires_at).getTime()
    if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
      await writeAuditLog({
        sessionId: sessionRow.id,
        eventType: "share_open_expired",
        token,
        ip,
        userAgent: request.headers.get("user-agent"),
      })
      return securePublicJson({ success: false, error: "Replay link expired" }, { status: 410 })
    }
  }

  const { data: turns, error: turnsErr } = await supabaseAdmin
    .from("vs_cpu_game_turns")
    .select("turn_index, engine_actor, engine_action, engine_events, action, is_legal, illegal_reason, player_lore_gain, cpu_lore_gain, player_card_name, cpu_card_name")
    .eq("session_id", sessionRow.id)
    .order("turn_index", { ascending: true })

  if (turnsErr) return securePublicJson({ success: false, error: turnsErr.message }, { status: 500 })

  await writeAuditLog({
    sessionId: sessionRow.id,
    eventType: "share_opened",
    token,
    ip,
    userAgent: request.headers.get("user-agent"),
    meta: { turns: (turns || []).length },
  })

  return securePublicJson({
    success: true,
    data: {
      session: sessionRow,
      turns: turns || [],
    },
  })
}
