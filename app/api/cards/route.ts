import { NextRequest, NextResponse } from "next/server"
import { Database, supabase } from "@/lib/db"
import { mockCards } from "@/lib/mock-data"
import { calculateStandardFoilPrice } from "@/lib/price-utils"
import type { ApiResponse, Card } from "@/lib/types"

// Evitar cache en route handlers: necesitamos listar TODO (más de 1000) y no servir respuestas viejas
export const dynamic = "force-dynamic"

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
    let totalCount: number | null = null
    
    if (source !== "mock" && supabase) {
      try {
        let allCards: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        // Si hay un límite, solo cargar esa cantidad (para carga inicial rápida)
        if (limit) {
            // Intentar primero con inkColor, si falla, usar sin ella
            let query = supabase
              .from("cards")
              .select("id,name,set,type,rarity,number,cardNumber,inkCost,inkable,lore,strength,willpower,classifications,price,foilPrice,normalStock,foilStock,image,productType,description,inkColor")
              .eq("status", filters.status)
              .limit(limit)
          
          if (filters.type) query = query.eq("type", filters.type)
          if (filters.set) query = query.eq("set", filters.set)
          if (filters.rarity) query = query.eq("rarity", filters.rarity)
          if (filters.language) query = query.eq("language", filters.language)
          
          const { data, error } = await query
          
          if (error) {
            // Si el error es por inkColor, intentar sin esa columna
            if (error.message.includes('inkColor') || error.message.includes('column') || error.message.includes('does not exist')) {
              console.log(`⚠ GET /api/cards - Error con inkColor, intentando sin ella: ${error.message}`)
              let fallbackQuery = supabase
                .from("cards")
                .select("id,name,set,type,rarity,number,cardNumber,inkCost,inkable,lore,strength,willpower,classifications,price,foilPrice,normalStock,foilStock,image,productType,description")
                .eq("status", filters.status)
                .limit(limit)
              
              if (filters.type) fallbackQuery = fallbackQuery.eq("type", filters.type)
              if (filters.set) fallbackQuery = fallbackQuery.eq("set", filters.set)
              if (filters.rarity) fallbackQuery = fallbackQuery.eq("rarity", filters.rarity)
              if (filters.language) fallbackQuery = fallbackQuery.eq("language", filters.language)
              
              const { data: fallbackData, error: fallbackError } = await fallbackQuery
              if (fallbackError) {
                console.log(`⚠ GET /api/cards - Supabase fallback error: ${fallbackError.message}, using MOCK`)
              } else if (fallbackData && fallbackData.length > 0) {
                // Asegurar que normalStock y foilStock sean números
                allCards = fallbackData.map(card => ({
                  ...card,
                  normalStock: card.normalStock ?? 0,
                  foilStock: card.foilStock ?? 0
                }))
                const cardsWithStock = allCards.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0))
                console.log(`📊 Cards loaded (limited, without inkColor): ${allCards.length} cards`)
                console.log(`   📦 Cartas con stock: ${cardsWithStock.length}`)
              }
            } else {
              console.log(`⚠ GET /api/cards - Supabase error: ${error.message}, using MOCK`)
            }
          } else if (data && data.length > 0) {
            // Asegurar que normalStock y foilStock sean números
            allCards = data.map(card => ({
              ...card,
              normalStock: card.normalStock ?? 0,
              foilStock: card.foilStock ?? 0,
              inkColor: card.inkColor || null,
              // Tu schema no tiene columna "color" (solo inkColor). Mantener compatibilidad.
              color: null
            }))
            const cardsWithStock = allCards.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0))
            const cardsWithColor = allCards.filter(c => c.inkColor)
            console.log(`📊 Cards loaded (limited): ${allCards.length} cards`)
            console.log(`   📦 Cartas con stock: ${cardsWithStock.length}`)
            console.log(`   🎨 Cartas con color: ${cardsWithColor.length}`)
          } else {
            console.log(`⚠ GET /api/cards - Query returned no data, using MOCK`)
          }
        } else {
          // Obtener todas las cartas usando paginación (solo si no hay límite)
          // IMPORTANTE: Usar función RPC para evitar problemas del schema cache de PostgREST con inkColor
          // Primero intentar con la función RPC si existe
          try {
            // ✅ FIX DEFINITIVO: NO usar .range() en RPC (puede ignorarse y quedarse en 1000).
            // Usar una RPC paginada por parámetros limit/offset.
            // Requiere la función SQL: get_cards_with_ink_color_paged(limit, offset, filtros...)
            let rpcAll: any[] = []
            let rpcPage = 0
            let rpcHasMore = true
            let rpcSupported = true

            while (rpcHasMore) {
              const offset = rpcPage * pageSize
              const { data: rpcData, error: rpcError } = await supabase.rpc("get_cards_with_ink_color_paged", {
                p_status: filters.status,
                p_limit: pageSize,
                p_offset: offset,
                p_type: filters.type ?? null,
                p_set: filters.set ?? null,
                p_rarity: filters.rarity ?? null,
                p_language: filters.language ?? null,
              })

              if (rpcError) {
                rpcSupported = false
                console.log(
                  `⚠ GET /api/cards - RPC paged not available/failed on page ${rpcPage + 1}: ${rpcError.message}, using table pagination`
                )
                break
              }

              if (rpcData && rpcData.length > 0) {
                rpcAll = [...rpcAll, ...rpcData]
                console.log(
                  `📊 Cards RPC(paged) - Page ${rpcPage + 1}: loaded ${rpcData.length} cards, total so far: ${rpcAll.length}`
                )
              }

              rpcHasMore = !!(rpcData && rpcData.length === pageSize)
              rpcPage++

              // Safety limit: no más de 50 páginas (50,000 cartas máximo)
              if (rpcPage >= 50) {
                console.log(
                  `⚠️ Reached safety limit of 50 pages (50,000 cards) while paging RPC(paged). Loaded ${rpcAll.length} cards.`
                )
                break
              }
            }

            if (rpcSupported && rpcAll.length > 0) {
              console.log(`✅ GET /api/cards - Using RPC(paged), loaded ${rpcAll.length} cards with inkColor`)

              // Normalizar datos (la RPC ya filtra por status/filtros)
              allCards = rpcAll.map((card: any) => ({
                ...card,
                normalStock: card.normalStock ?? 0,
                foilStock: card.foilStock ?? 0,
                inkColor: card.inkColor || null,
                // Compatibilidad: tu schema no tiene columna "color"
                color: null,
              }))

              const cardsWithColor = allCards.filter((c) => c.inkColor)
              console.log(`🎨 Cards with color from RPC(paged): ${cardsWithColor.length} out of ${allCards.length}`)

              hasMore = false // Ya tenemos todas las cartas (vía RPC paginada por parámetros)
            } else {
              console.log(`⚠ GET /api/cards - RPC(paged) not used, using table pagination`)
              hasMore = true
            }
          } catch (rpcErr) {
            // Si hay error al llamar RPC, continuar con paginación normal
            console.log(`⚠ GET /api/cards - RPC call error: ${rpcErr instanceof Error ? rpcErr.message : 'unknown'}, using pagination`)
            hasMore = true
          }
          
          // Continuar con paginación normal si RPC no funcionó
          while (hasMore) {
            const from = page * pageSize
            const to = from + pageSize - 1
            
            // Solo seleccionar campos necesarios para mejorar rendimiento
            // Intentar con inkColor, si falla, usar sin ella
            let query = supabase
              .from("cards")
              .select(
                "id,name,set,type,rarity,number,cardNumber,inkCost,inkable,lore,strength,willpower,classifications,price,foilPrice,normalStock,foilStock,image,productType,description,inkColor",
                page === 0 ? ({ count: "exact" } as any) : undefined
              )
              .eq("status", filters.status)
              // Importante: ordenar para que la paginación por range/offset sea estable
              .order("id", { ascending: true })
              .range(from, to)

            if (filters.type) query = query.eq("type", filters.type)
            if (filters.set) query = query.eq("set", filters.set)
            if (filters.rarity) query = query.eq("rarity", filters.rarity)
            if (filters.language) query = query.eq("language", filters.language)

            const { data, error, count } = await query
            if (page === 0 && typeof count === "number") {
              totalCount = count
              console.log(`📌 Cards total count (status=${filters.status}): ${totalCount}`)
            }
            
            if (error) {
              // Si el error es por inkColor, intentar sin esa columna
              if (error.message.includes('inkColor') || error.message.includes('column') || error.message.includes('does not exist')) {
                console.log(`⚠ GET /api/cards - Error con inkColor en página ${page + 1}, intentando sin ella: ${error.message}`)
                let fallbackQuery = supabase
                  .from("cards")
                  .select(
                    "id,name,set,type,rarity,number,cardNumber,inkCost,inkable,lore,strength,willpower,classifications,price,foilPrice,normalStock,foilStock,image,productType,description",
                    page === 0 ? ({ count: "exact" } as any) : undefined
                  )
                  .eq("status", filters.status)
                  .order("id", { ascending: true })
                  .range(from, to)
                
                if (filters.type) fallbackQuery = fallbackQuery.eq("type", filters.type)
                if (filters.set) fallbackQuery = fallbackQuery.eq("set", filters.set)
                if (filters.rarity) fallbackQuery = fallbackQuery.eq("rarity", filters.rarity)
                if (filters.language) fallbackQuery = fallbackQuery.eq("language", filters.language)
                
                const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
                if (page === 0 && typeof fallbackCount === "number") {
                  totalCount = fallbackCount
                  console.log(`📌 Cards total count (fallback, status=${filters.status}): ${totalCount}`)
                }
                if (fallbackError) {
                  console.log(`⚠ GET /api/cards - Supabase fallback error: ${fallbackError.message}, using MOCK`)
                  break
                }
                
                if (fallbackData && fallbackData.length > 0) {
                  // Asegurar que normalStock y foilStock sean números
                  // Nota: fallbackData no incluye inkColor porque la columna no existe o falló
                  const normalizedData = fallbackData.map(card => ({
                    ...card,
                    normalStock: card.normalStock ?? 0,
                    foilStock: card.foilStock ?? 0,
                    inkColor: null, // Explícitamente null cuando no se puede obtener
                    color: null
                  }))
                  allCards = [...allCards, ...normalizedData]
                  console.log(`📊 Cards pagination - Page ${page + 1}: loaded ${fallbackData.length} cards (without inkColor - column may not exist), total so far: ${allCards.length}`)
                } else {
                  hasMore = false
                }
              } else {
                console.log(`⚠ GET /api/cards - Supabase error en página ${page + 1}: ${error.message}, using MOCK`)
                break
              }
            }
            
            if (data && data.length > 0) {
              // Debug: verificar si inkColor viene en la respuesta de Supabase
              const sampleCard = data[0]
              const hasInkColorInResponse = 'inkColor' in sampleCard
              const hasColorInResponse = 'color' in sampleCard
              
              if (page === 0) {
                console.log(`🔍 Page 1 - Sample card keys:`, Object.keys(sampleCard))
                console.log(`🔍 Page 1 - Has inkColor in response:`, hasInkColorInResponse, sampleCard.inkColor)
                console.log(`🔍 Page 1 - Has color in response:`, hasColorInResponse, (sampleCard as any).color)
                // Verificar si PostgREST está devolviendo inkColor con otro nombre (lowercase, etc.)
                const hasInkcolorLowercase = 'inkcolor' in sampleCard
                console.log(`🔍 Page 1 - Has inkcolor (lowercase) in response:`, hasInkcolorLowercase, (sampleCard as any).inkcolor)
                // Verificar si hay cartas con color en la primera página
                const firstPageWithColor = data.filter(c => (c as any).inkColor || (c as any).inkcolor)
                console.log(`🔍 Page 1 - Cards with color in raw data:`, firstPageWithColor.length, "out of", data.length)
                if (firstPageWithColor.length > 0) {
                  console.log(`🔍 Page 1 - Sample cards with color:`, firstPageWithColor.slice(0, 3).map(c => ({ 
                    id: c.id, 
                    name: c.name, 
                    inkColor: (c as any).inkColor, 
                    inkcolor: (c as any).inkcolor
                  })))
                } else {
                  console.warn(`⚠️ Page 1 - NO CARDS WITH COLOR in raw Supabase response!`)
                  console.warn(`⚠️ Page 1 - Sample card from Supabase (FULL OBJECT):`, JSON.stringify(sampleCard, null, 2))
                  console.warn(`⚠️ Page 1 - All keys in sample card:`, Object.keys(sampleCard))
                  // Verificar todas las posibles variaciones del nombre
                  const possibleNames = ['inkColor', 'inkcolor', 'InkColor', 'INKCOLOR']
                  possibleNames.forEach(name => {
                    if (name in sampleCard) {
                      console.warn(`⚠️ Page 1 - Found column with name "${name}":`, (sampleCard as any)[name])
                    }
                  })
                }
              }
              
              // Asegurar que normalStock y foilStock sean números, e incluir inkColor si existe
              // PostgREST puede devolver camelCase como lowercase, verificar ambos
              // IMPORTANTE: Si inkColor viene como null pero la columna existe, puede ser un problema del schema cache
              const normalizedData = data.map(card => {
                const cardAny = card as any
                // Si inkColor es null pero sabemos que debería tener valor, intentar obtenerlo de otra manera
                // Por ahora, preservar lo que viene de PostgREST
                return {
                  ...card,
                  normalStock: card.normalStock ?? 0,
                  foilStock: card.foilStock ?? 0,
                  // PostgREST puede devolver inkColor como 'inkcolor' (lowercase) o 'inkColor' (camelCase)
                  // Intentar ambos nombres, pero si ambos son null, puede ser un problema del schema cache
                  inkColor: cardAny.inkColor !== undefined && cardAny.inkColor !== null ? cardAny.inkColor : 
                           cardAny.inkcolor !== undefined && cardAny.inkcolor !== null ? cardAny.inkcolor : null,
                  // Compatibilidad: tu schema no tiene columna "color"
                  color: null
                }
              })
              
              // Debug: verificar si inkColor está presente después de normalizar
              const cardsWithColor = normalizedData.filter(c => c.inkColor)
              if (page === 0) {
                console.log(`🎨 First page: ${cardsWithColor.length} cards with color out of ${normalizedData.length}`)
                if (cardsWithColor.length > 0) {
                  console.log(`🎨 Sample colors:`, cardsWithColor.slice(0, 3).map(c => ({ name: c.name, inkColor: c.inkColor })))
                } else {
                  console.warn(`⚠️ No cards with color found in first page! Sample card:`, {
                    id: normalizedData[0].id,
                    name: normalizedData[0].name,
                    hasInkColor: 'inkColor' in normalizedData[0],
                    inkColorValue: normalizedData[0].inkColor,
                    allKeys: Object.keys(normalizedData[0])
                  })
                }
              }
              
              allCards = [...allCards, ...normalizedData]
              console.log(`📊 Cards pagination - Page ${page + 1}: loaded ${data.length} cards, total so far: ${allCards.length}`)
            }
            
            // Continuar si obtuvimos exactamente pageSize items (probablemente hay más)
            // Detener si obtuvimos menos (última página) o si no hay datos
            hasMore = !!(data && data.length === pageSize)
            
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
          // Asegurar que normalStock y foilStock sean números, e incluir inkColor si existe
          cards = allCards.map(card => ({
            ...card,
            normalStock: card.normalStock ?? 0,
            foilStock: card.foilStock ?? 0,
            inkColor: card.inkColor || null,
            color: null
          })) as unknown as Card[]
          dataSource = "supabase"
          
          // Debug: verificar stock y color en las primeras cartas
          const cardsWithStock = cards.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0))
          const cardsWithColor = cards.filter(c => (c as any).inkColor)
          console.log(`✓ GET /api/cards - Using SUPABASE (${cards.length} cards from ${page} pages)`)
          console.log(`   📦 Cartas con stock: ${cardsWithStock.length} de ${cards.length}`)
          console.log(`   🎨 Cartas con color: ${cardsWithColor.length} de ${cards.length}`)
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
        returned: cards?.length ?? 0,
        total: totalCount,
      } as any,
    } as any
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...(typeof totalCount === "number" ? { "X-Total-Count": String(totalCount) } : {}),
      },
    })
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
      let cardId = product.id
      if (!cardId && productType === "card") {
        const setCode = product.set || "unknown"
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
        set: product.set ?? (productType === "card" ? "unknown" : null),
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

