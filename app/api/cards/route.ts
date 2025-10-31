import { NextRequest, NextResponse } from "next/server"
import { Database, supabase } from "@/lib/db"
import { mockCards } from "@/lib/mock-data"
import type { ApiResponse, Card } from "@/lib/types"

// Initialize database with mock data
Database.initialize(mockCards as any)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const source = (searchParams.get("source") || "auto").toLowerCase()
    const filters = {
      status: searchParams.get("status") || "approved",
      type: searchParams.get("type") || undefined,
      set: searchParams.get("set") || undefined,
      rarity: searchParams.get("rarity") || undefined,
      language: searchParams.get("language") || undefined,
    }

    // Intentar leer desde Supabase si está configurado
    let cards: Card[] | null = null
    if (source !== "mock" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const query = supabase
        .from("cards")
        .select("*")
        .eq("status", filters.status)

      if (filters.type) query.eq("type", filters.type)
      if (filters.set) query.eq("set", filters.set)
      if (filters.rarity) query.eq("rarity", filters.rarity)
      if (filters.language) query.eq("language", filters.language)

      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        // Si no hay datos en Supabase, caer al mock
        if (data.length > 0) {
          cards = data as unknown as Card[]
        }
      }
      // Si la tabla no existe (error de esquema) o cualquier error, caerá al mock
    }

    if (!cards) {
      cards = await Database.getCards(filters)
    }

    const response: ApiResponse<Card[]> = {
      success: true,
      data: cards,
    }

    return NextResponse.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const card: Card = await request.json()

    // Validate required fields
    if (!card.name || !card.type || !card.rarity) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, type, rarity",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Intentar crear en Supabase si está configurado
    let newCard: Card | null = null
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const row: any = {
        id: card.id || `card_${Date.now()}`,
        name: card.name,
        image: (card as any).image ?? null,
        set: (card as any).set ?? "firstChapter",
        rarity: card.rarity,
        type: card.type,
        number: (card as any).number ?? 0,
        cardNumber: (card as any).cardNumber ?? null,
        price: (card as any).price ?? null,
        foilPrice: (card as any).foilPrice ?? null,
        description: (card as any).description ?? null,
        version: (card as any).version ?? "normal",
        language: (card as any).language ?? "en",
        status: (card as any).status ?? "approved",
        normalStock: (card as any).normalStock ?? (card as any).stock ?? 0,
        foilStock: (card as any).foilStock ?? 0,
      }

      const { data, error } = await supabase.from("cards").insert(row).select("*").single()
      if (!error && data) {
        newCard = data as unknown as Card
        // Crear log
        await supabase.from("logs").insert({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: "system",
          action: "card_created",
          entityType: "card",
          entityId: row.id,
          details: { source: "api" },
        })
      }
    }

    // Fallback mock
    if (!newCard) {
      newCard = await Database.createCard(card)
      await Database.createLog({
        userId: "system",
        action: "card_created",
        entityType: "card",
        entityId: newCard.id,
      })
    }

    const response: ApiResponse<Card> = {
      success: true,
      data: newCard,
      message: "Card created successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    return NextResponse.json(response, { status: 500 })
  }
}

