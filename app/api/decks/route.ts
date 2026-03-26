import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"
import { getUserAccess } from "@/lib/subscription-access"

export const dynamic = "force-dynamic"
const FREE_DECK_LIMIT = 2

type DeckCardPayload = { cardId: string; quantity: number }

function normalizeCards(input: unknown): DeckCardPayload[] | null {
  if (!Array.isArray(input)) return null
  const out: DeckCardPayload[] = []
  for (const row of input) {
    if (!row || typeof row !== "object") return null
    const cardId = String((row as DeckCardPayload).cardId ?? "").trim()
    const q = Math.floor(Number((row as DeckCardPayload).quantity))
    if (!cardId) return null
    if (Number.isNaN(q) || q < 1 || q > 4) return null
    out.push({ cardId, quantity: q })
  }
  return out
}

function mapRow(row: {
  id: string
  user_id: string
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

/** GET — listar mazos del usuario autenticado */
export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const { data, error } = await supabaseAdmin
    .from("user_decks")
    .select("id, user_id, name, cards, created_at, updated_at")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("user_decks GET:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRow),
  })
}

/** POST — crear mazo */
export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  let body: { name?: string; cards?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 })
  }

  const cards = normalizeCards(body.cards)
  if (!cards || cards.length === 0) {
    return NextResponse.json(
      { success: false, error: "cards must be a non-empty array of { cardId, quantity (1–4) }" },
      { status: 400 }
    )
  }

  const [access, countRes] = await Promise.all([
    getUserAccess(auth.userId),
    supabaseAdmin.from("user_decks").select("id", { head: true, count: "exact" }).eq("user_id", auth.userId),
  ])
  if (countRes.error) {
    console.error("user_decks count POST:", countRes.error)
    return NextResponse.json({ success: false, error: countRes.error.message }, { status: 500 })
  }

  const maxDecks = access.maxDecks ?? null
  const currentDecks = Number(countRes.count || 0)
  if (!access.isPro && maxDecks != null && currentDecks >= maxDecks) {
    return NextResponse.json(
      {
        success: false,
        code: "FREE_DECK_LIMIT_REACHED",
        error: `Plan Free: máximo ${FREE_DECK_LIMIT} mazos. Suscríbete para mazos ilimitados.`,
        data: { maxDecks, currentDecks, isPro: access.isPro, source: access.source },
      },
      { status: 403 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("user_decks")
    .insert({
      user_id: auth.userId,
      name,
      cards,
    })
    .select("id, user_id, name, cards, created_at, updated_at")
    .single()

  if (error) {
    console.error("user_decks POST:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: mapRow(data) })
}
