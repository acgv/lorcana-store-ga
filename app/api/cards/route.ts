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
    const product: any = await request.json()
    const productType = product.productType || "card"

    // Validar campos requeridos según el tipo de producto
    if (!product.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: name",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Para cartas, validar campos específicos
    if (productType === "card" && (!product.type || !product.rarity)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields for card: type, rarity",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Intentar crear en Supabase si está configurado
    let newProduct: any = null
    let dataSource = "mock"
    
    if (supabase) {
      try {
      const row: any = {
        id: product.id || `${productType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: product.name,
        image: product.image ?? null,
        price: product.price ?? null,
        description: product.description ?? null,
        status: product.status ?? "approved",
        productType: productType,
        // Campos específicos de cartas (requeridos por schema, pero pueden ser null para otros productos)
        set: product.set ?? (productType === "card" ? "firstChapter" : (productType === "booster" ? product.set : null)),
        rarity: product.rarity ?? (productType === "card" ? "common" : null), // Requerido por schema, usar default para no-cartas
        type: product.type ?? (productType === "card" ? "character" : null), // Requerido por schema, usar default para no-cartas
        number: product.number ?? 0,
        cardNumber: product.cardNumber ?? null,
        foilPrice: product.foilPrice ?? null,
        version: product.version ?? "normal",
        language: product.language ?? "en",
        normalStock: product.normalStock ?? product.stock ?? 0,
        foilStock: product.foilStock ?? 0,
      }

      const { data, error } = await supabase.from("cards").insert(row).select("*").single()
      if (!error && data) {
        newProduct = data as unknown as Card
        dataSource = "supabase"
        console.log(`✓ POST /api/cards - Created in SUPABASE: ${newProduct.id} (${productType})`)
        // Crear log
        await supabase.from("logs").insert({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: "system",
          action: `${productType}_created`,
          entityType: "card",
          entityId: row.id,
          details: { source: "api", productType },
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
    if (!newProduct) {
      if (productType === "card") {
        newProduct = await Database.createCard(product as Card)
      } else {
        // Para otros productos, crear directamente en Supabase o mock
        newProduct = { ...product, id: product.id || `${productType}_${Date.now()}` }
      }
      console.log(`✓ POST /api/cards - Created in MOCK: ${newProduct.id} (${productType})`)
      await Database.createLog({
        userId: "system",
        action: `${productType}_created`,
        entityType: "card",
        entityId: newProduct.id,
      })
    }

    const response: ApiResponse<Card> = {
      success: true,
      data: newProduct,
      message: `${productType === "card" ? "Card" : "Product"} created successfully`,
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

