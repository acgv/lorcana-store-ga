import { NextRequest, NextResponse } from "next/server"
import { Database, supabase } from "@/lib/db"
import { mockCards } from "@/lib/mock-data"
import { calculateStandardFoilPrice } from "@/lib/price-utils"
import type { ApiResponse, Card } from "@/lib/types"

// Initialize database with mock data
Database.initialize(mockCards as any)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const source = (searchParams.get("source") || "auto").toLowerCase()
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined
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

        // Si hay un límite, solo cargar esa cantidad (para carga inicial rápida)
        if (limit) {
          let query = supabase
            .from("cards")
            .select("id,name,set,type,rarity,number,cardNumber,price,foilPrice,normalStock,foilStock,image,productType,description")
            .eq("status", filters.status)
            .limit(limit)
          
          if (filters.type) query = query.eq("type", filters.type)
          if (filters.set) query = query.eq("set", filters.set)
          if (filters.rarity) query = query.eq("rarity", filters.rarity)
          if (filters.language) query = query.eq("language", filters.language)
          
          const { data, error } = await query
          
          if (error) {
            console.log(`⚠ GET /api/cards - Supabase error: ${error.message}, using MOCK`)
          } else if (data) {
            allCards = data
            console.log(`📊 Cards loaded (limited): ${allCards.length} cards`)
          }
        } else {
          // Obtener todas las cartas usando paginación (solo si no hay límite)
          // Continuar hasta obtener menos de pageSize items (más robusto que depender del count)
          while (hasMore) {
            const from = page * pageSize
            const to = from + pageSize - 1
            
            // Solo seleccionar campos necesarios para mejorar rendimiento
            let query = supabase
              .from("cards")
              .select("id,name,set,type,rarity,number,cardNumber,price,foilPrice,normalStock,foilStock,image,productType,description")
              .eq("status", filters.status)
              .range(from, to)

            if (filters.type) query = query.eq("type", filters.type)
            if (filters.set) query = query.eq("set", filters.set)
            if (filters.rarity) query = query.eq("rarity", filters.rarity)
            if (filters.language) query = query.eq("language", filters.language)

            const { data, error } = await query
            
            if (error) {
              console.log(`⚠ GET /api/cards - Supabase error: ${error.message}, using MOCK`)
              break
            }
            
            if (data && data.length > 0) {
              allCards = [...allCards, ...data]
              console.log(`📊 Cards pagination - Page ${page + 1}: loaded ${data.length} cards, total so far: ${allCards.length}`)
            }
            
            // Continuar si obtuvimos exactamente pageSize items (probablemente hay más)
            // Detener si obtuvimos menos (última página) o si no hay datos
            hasMore = data && data.length === pageSize
            
            if (!hasMore) {
              if (data && data.length > 0) {
                console.log(`✅ Cards pagination complete: loaded ${allCards.length} cards (last page had ${data.length} items)`)
              } else {
                console.log(`✅ Cards pagination complete: loaded ${allCards.length} cards (no more data)`)
              }
            }
            
            page++
            
            // Safety limit: no más de 50 páginas (50,000 cartas máximo)
            if (page >= 50) {
              console.log(`⚠️ Reached safety limit of 50 pages (50,000 cards). Loaded ${allCards.length} cards.`)
              break
            }
          }
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
      // Generar ID consistente para cartas (formato: set-number, ej: firstChapter-205)
      let cardId = product.id
      if (!cardId && productType === "card") {
        const setCode = product.set || "firstChapter"
        const cardNum = product.number || product.cardNumber?.split("/")[0] || Date.now()
        cardId = `${setCode}-${cardNum}`.toLowerCase()
      } else if (!cardId) {
        cardId = `${productType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      }
      
      // Validar campos requeridos para cartas
      if (productType === "card") {
        if (!product.set || !product.rarity || !product.type) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields for card: set, rarity, type are required",
            } as ApiResponse,
            { status: 400 }
          )
        }
      }

      // Calcular precio foil usando el estándar
      const basePrice = product.price ?? 0
      let foilPrice = product.foilPrice ?? null
      
      // Si no se proporciona foilPrice, calcularlo usando el estándar
      if (foilPrice === null || foilPrice === undefined) {
        foilPrice = calculateStandardFoilPrice(basePrice)
      } else {
        // Si se proporciona, asegurar que sea mayor que price usando el estándar
        foilPrice = Math.max(Number(foilPrice), calculateStandardFoilPrice(basePrice))
      }

      const row: any = {
        id: cardId,
        name: product.name,
        image: product.image ?? null,
        price: basePrice,
        description: product.description ?? null,
        status: product.status ?? "approved",
        // Campos específicos de cartas (requeridos por schema NOT NULL)
        set: product.set ?? (productType === "card" ? "firstChapter" : null),
        rarity: product.rarity ?? (productType === "card" ? "common" : null),
        type: product.type ?? (productType === "card" ? "character" : null),
        number: product.number ?? 0,
        cardNumber: product.cardNumber ?? null,
        foilPrice: foilPrice,
        version: product.version ?? "normal",
        language: product.language ?? "en",
        normalStock: product.normalStock ?? product.stock ?? 0,
        foilStock: product.foilStock ?? 0,
      }

      // Agregar productType solo si la columna existe (puede no existir en schemas antiguos)
      // Intentaremos agregarlo, pero si falla, continuaremos sin él
      if (productType) {
        row.productType = productType
      }

      console.log(`📝 POST /api/cards - Creating card with ID: ${cardId}`, { 
        name: product.name, 
        set: product.set, 
        number: product.number,
        status: product.status || "approved",
        productType: productType
      })
      console.log(`📝 POST /api/cards - Row data:`, JSON.stringify(row, null, 2))

      const { data, error } = await supabase.from("cards").insert(row).select("*").single()
      if (!error && data) {
        newProduct = data as unknown as Card
        dataSource = "supabase"
        console.log(`✅ POST /api/cards - Created in SUPABASE: ${newProduct.id} (${productType})`)
        // Crear log
        try {
          await supabase.from("logs").insert({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId: "system",
            action: `${productType}_created`,
            entityType: "card",
            entityId: row.id,
            details: { source: "api", productType },
          })
        } catch (logError) {
          console.warn("⚠️ Failed to create log entry:", logError)
        }
      } else {
        console.error(`❌ POST /api/cards - Supabase error:`, error)
        console.error(`❌ Error details:`, {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        })
        // No usar MOCK, retornar el error para que el frontend lo maneje
        return NextResponse.json(
          {
            success: false,
            error: error?.message || "Failed to create card in database",
            details: error?.details,
            hint: error?.hint,
          } as ApiResponse,
          { status: 500 }
        )
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

