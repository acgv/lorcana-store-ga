import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const { data: season, error: seasonError } = await supabaseAdmin
      .from("weekly_event_seasons")
      .select("id, name, description, reward_xp, reward_badge_id, starts_at, ends_at")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (seasonError) {
      return NextResponse.json({ success: false, error: seasonError.message }, { status: 500 })
    }

    if (!season) {
      return NextResponse.json({ success: true, data: null })
    }

    const { data: goals, error: goalsError } = await supabaseAdmin
      .from("weekly_event_goals")
      .select("id, code, label, target, sort_order")
      .eq("season_id", season.id)
      .order("sort_order", { ascending: true })

    if (goalsError) {
      return NextResponse.json({ success: false, error: goalsError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { season, goals: goals || [] } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
