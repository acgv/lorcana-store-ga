import { NextResponse } from "next/server"
import { supabase } from "@/lib/db"
import { mockCards } from "@/lib/mock-data"
import type { Card, ApiResponse } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Card ID is required" },
      { status: 400 }
    )
  }

  let card: Card | null = null
  let dataSource = "mock"

  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("id", id)
        .eq("status", "approved")
        .single()

      if (!error && data) {
        card = data as Card
        dataSource = "supabase"
        console.log(`✓ GET /api/cards/${id} - Found in SUPABASE`)
      } else {
        console.log(`⚠ GET /api/cards/${id} - Not found in Supabase:`, error?.message)
      }
    } catch (err) {
      console.log(`⚠ GET /api/cards/${id} - Supabase connection error:`, err)
    }
  }

  // Fallback to mock data if not found in Supabase
  if (!card) {
    card = mockCards.find((c) => c.id === id) || null
    if (card) {
      console.log(`✓ GET /api/cards/${id} - Found in MOCK`)
    }
  }

  if (!card) {
    return NextResponse.json(
      { success: false, error: "Card not found" },
      { status: 404 }
    )
  }

  const response: ApiResponse<Card> = {
    success: true,
    data: card,
    meta: {
      source: dataSource,
    } as any,
  }

  return NextResponse.json(response)
}

