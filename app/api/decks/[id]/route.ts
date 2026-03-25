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

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
  }

  let body: { name?: string; cards?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const patch: { name?: string; cards?: DeckCardPayload[] } = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) {
      return NextResponse.json({ success: false, error: "name cannot be empty" }, { status: 400 })
    }
    patch.name = name
  }
  if (body.cards !== undefined) {
    const cards = normalizeCards(body.cards)
    if (!cards) {
      return NextResponse.json(
        { success: false, error: "cards must be an array of { cardId, quantity (1–4) }" },
        { status: 400 }
      )
    }
    patch.cards = cards
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("user_decks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id, user_id, name, cards, created_at, updated_at")
    .single()

  if (error) {
    console.error("user_decks PATCH:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ success: false, error: "Deck not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: mapRow(data) })
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
  }

  const { data: deleted, error } = await supabaseAdmin
    .from("user_decks")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("id")

  if (error) {
    console.error("user_decks DELETE:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!deleted?.length) {
    return NextResponse.json({ success: false, error: "Deck not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
