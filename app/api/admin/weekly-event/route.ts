import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db"

type GoalInput = { code: string; label: string; target: number; sortOrder?: number }

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (!supabaseAdmin) return null
  const authHeader = request.headers.get("Authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null
  const cookieToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("supabase-auth-token")?.value ||
    request.cookies.get("admin_token")?.value
  const token = bearer || cookieToken
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data.user?.id || null
}

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdmin(request)
  if (!adminCheck.success) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status || 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
  }

  const { data: seasons, error } = await supabaseAdmin
    .from("weekly_event_seasons")
    .select("id, name, description, reward_xp, reward_badge_id, starts_at, ends_at, is_active, created_at")
    .order("starts_at", { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const ids = (seasons || []).map((s) => s.id)
  const { data: goals, error: goalsError } = await supabaseAdmin
    .from("weekly_event_goals")
    .select("id, season_id, code, label, target, sort_order")
    .in("season_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order", { ascending: true })

  if (goalsError) return NextResponse.json({ success: false, error: goalsError.message }, { status: 500 })

  return NextResponse.json({ success: true, data: { seasons: seasons || [], goals: goals || [] } })
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdmin(request)
  if (!adminCheck.success) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status || 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
  }

  const body = await request.json()
  const name = String(body?.name || "").trim()
  const description = String(body?.description || "").trim()
  const rewardXp = Number(body?.rewardXp || 120)
  const rewardBadgeId = String(body?.rewardBadgeId || "").trim() || null
  const startsAt = body?.startsAt ? new Date(body.startsAt).toISOString() : new Date().toISOString()
  const endsAt = body?.endsAt ? new Date(body.endsAt).toISOString() : null
  const activate = Boolean(body?.activate)
  const goals = (Array.isArray(body?.goals) ? body.goals : []) as GoalInput[]

  if (!name) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 })
  if (!goals.length) return NextResponse.json({ success: false, error: "at least one goal is required" }, { status: 400 })

  const userId = await getUserIdFromRequest(request)

  const { data: season, error: seasonError } = await supabaseAdmin
    .from("weekly_event_seasons")
    .insert({
      name,
      description: description || null,
      reward_xp: Math.max(0, Math.floor(rewardXp || 0)),
      reward_badge_id: rewardBadgeId,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: activate,
      created_by: userId,
    })
    .select("id")
    .single()

  if (seasonError || !season) {
    return NextResponse.json({ success: false, error: seasonError?.message || "failed creating season" }, { status: 500 })
  }

  if (activate) {
    await supabaseAdmin
      .from("weekly_event_seasons")
      .update({ is_active: false })
      .neq("id", season.id)
  }

  const rows = goals.map((g, idx) => ({
    season_id: season.id,
    code: String(g.code || "").trim() || `goal_${idx + 1}`,
    label: String(g.label || "").trim() || `Meta ${idx + 1}`,
    target: Math.max(1, Math.floor(Number(g.target) || 1)),
    sort_order: Number.isFinite(g.sortOrder) ? Number(g.sortOrder) : idx,
  }))

  const { error: goalsError } = await supabaseAdmin.from("weekly_event_goals").insert(rows)
  if (goalsError) {
    return NextResponse.json({ success: false, error: goalsError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { seasonId: season.id } })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await verifyAdmin(request)
  if (!adminCheck.success) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status || 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
  }
  const body = await request.json()
  const seasonId = String(body?.seasonId || "")
  if (!seasonId) return NextResponse.json({ success: false, error: "seasonId required" }, { status: 400 })

  await supabaseAdmin.from("weekly_event_seasons").update({ is_active: false }).neq("id", seasonId)
  const { error } = await supabaseAdmin.from("weekly_event_seasons").update({ is_active: true }).eq("id", seasonId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
