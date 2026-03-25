import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type DeckCardPayload = { cardId: string; quantity: number }

function normalizeCards(input: unknown): DeckCardPayload[] | null {
  if (!Array.isArray(input)) return null
  const out: DeckCardPayload[] = []
  for (const row of input) {
    if (!row || typeof row !== "object") return null
    const cardId = String((row as { cardId?: string }).cardId ?? "").trim()
    const q = Math.floor(Number((row as { quantity?: number }).quantity))
    if (!cardId) return null
    if (Number.isNaN(q) || q < 1 || q > 4) return null
    out.push({ cardId, quantity: q })
  }
  return out
}

function mapRow(row: {
  id: string
  name: string
  cards: unknown
  created_at: string
  updated_at: string
}) {
  return {
    id: row.id,
    name: row.name,
    cards: row.cards as DeckCardPayload[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * POST — importar mazos desde localStorage (una sola vez cuando el servidor está vacío).
 * Body: { decks: { name: string, cards: { cardId, quantity }[] }[] }
 */
export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const { count: existing, error: countErr } = await supabaseAdmin
    .from("user_decks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.userId)

  if (countErr) {
    console.error("user_decks migrate count:", countErr)
    return NextResponse.json({ success: false, error: countErr.message }, { status: 500 })
  }

  if (existing != null && existing > 0) {
    return NextResponse.json(
      { success: false, error: "Ya tienes mazos en la nube; la migración solo aplica con lista vacía." },
      { status: 409 }
    )
  }

  let body: { decks?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.decks) || body.decks.length === 0) {
    return NextResponse.json({ success: false, error: "decks must be a non-empty array" }, { status: 400 })
  }

  const rows: { user_id: string; name: string; cards: DeckCardPayload[] }[] = []

  for (const d of body.decks) {
    if (!d || typeof d !== "object") {
      return NextResponse.json({ success: false, error: "Invalid deck entry" }, { status: 400 })
    }
    const name = String((d as { name?: string }).name ?? "").trim()
    const cards = normalizeCards((d as { cards?: unknown }).cards)
    if (!name || !cards || cards.length === 0) {
      return NextResponse.json(
        { success: false, error: "Each deck needs name and valid cards" },
        { status: 400 }
      )
    }
    rows.push({ user_id: auth.userId, name, cards })
  }

  const { data, error } = await supabaseAdmin.from("user_decks").insert(rows).select("id, name, cards, created_at, updated_at")

  if (error) {
    console.error("user_decks migrate:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRow),
  })
}
