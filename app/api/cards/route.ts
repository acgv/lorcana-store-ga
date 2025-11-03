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
    let dataSource = "mock"
    
    if (source !== "mock" && supabase) {
      try {
        let allCards: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        // Obtener todas las cartas usando paginación
        while (hasMore) {
          const from = page * pageSize
          const to = from + pageSize - 1
          
          let query = supabase
            .from("cards")
            .select("*", { count: "exact" })
            .eq("status", filters.status)
            .range(from, to)

          if (filters.type) query = query.eq("type", filters.type)
          if (filters.set) query = query.eq("set", filters.set)
          if (filters.rarity) query = query.eq("rarity", filters.rarity)
          if (filters.language) query = query.eq("language", filters.language)

          const { data, error, count } = await query
          
          if (error) {
            console.log(`⚠ GET /api/cards - Supabase error: ${error.message}, using MOCK`)
            break
          }
          
          if (data && data.length > 0) {
            allCards = [...allCards, ...data]
          }
          
          // Verificar si hay más páginas
          hasMore = data && data.length === pageSize && (count === null || allCards.length < count)
          page++
          
          // Safety limit: no más de 10 páginas (10,000 cartas máximo)
          if (page >= 10) break
        }

        if (allCards.length > 0) {
          cards = allCards as unknown as Card[]
          dataSource = "supabase"
          console.log(`✓ GET /api/cards - Using SUPABASE (${cards.length} cards from ${page} pages)`)
        } else {
          console.log("⚠ GET /api/cards - Supabase returned empty, using MOCK")
        }
      } catch (err) {
        console.log(`⚠ GET /api/cards - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}, using MOCK`)
      }
      // Si la tabla no existe (error de esquema) o cualquier error, caerá al mock
    } else {
      console.log("ℹ GET /api/cards - Supabase not configured or forced mock, using MOCK")
    }

    if (!cards) {
      cards = await Database.getCards(filters)
      if (dataSource !== "supabase") {
        console.log(`✓ GET /api/cards - Using MOCK (${cards.length} cards)`)
      }
    }

    const response: ApiResponse<Card[]> = {
      success: true,
      data: cards,
      meta: {
        source: dataSource,
        count: cards.length,
      } as any,
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
    let dataSource = "mock"
    
    if (supabase) {
      try {
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
        dataSource = "supabase"
        console.log(`✓ POST /api/cards - Created in SUPABASE: ${newCard.id}`)
        // Crear log
        await supabase.from("logs").insert({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: "system",
          action: "card_created",
          entityType: "card",
          entityId: row.id,
          details: { source: "api" },
        })
      } else {
        console.log(`⚠ POST /api/cards - Supabase error: ${error?.message || "unknown"}, using MOCK`)
      }
      } catch (err) {
        console.log(`⚠ POST /api/cards - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}, using MOCK`)
      }
    } else {
      console.log("ℹ POST /api/cards - Supabase not configured, using MOCK")
    }

    // Fallback mock
    if (!newCard) {
      newCard = await Database.createCard(card)
      console.log(`✓ POST /api/cards - Created in MOCK: ${newCard.id}`)
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
      meta: {
        source: dataSource,
      } as any,
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

