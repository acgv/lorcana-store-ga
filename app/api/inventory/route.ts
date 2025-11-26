import { NextResponse } from "next/server"
import { mockCards } from "@/lib/mock-data"
import { supabase, supabaseAdmin } from "@/lib/db"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// GET: Obtener todas las cartas y productos con su stock
export async function GET() {
  try {
    let dataSource = "mock"
    
    // Intentar desde Supabase primero si hay configuración
    if (supabase) {
      try {
        let allInventory: any[] = []
        
        // 1. Obtener todas las cartas (productType = 'card' o null)
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const from = page * pageSize
          const to = from + pageSize - 1
          
          const { data, error, count } = await supabase
            .from("cards")
            .select("id,name,set,type,rarity,number,cardNumber,price,foilPrice,normalStock,foilStock,image,productType", { count: "exact" })
            .range(from, to)
          
          if (error) {
            console.log(`⚠ GET /api/inventory - Supabase error (cards): ${error.message}`)
            break
          }
          
          if (data && data.length > 0) {
            // Normalizar cartas para el inventario
            const cards = data.map((card: any) => ({
              ...card,
              productType: card.productType || "card",
            }))
            allInventory = [...allInventory, ...cards]
          }
          
          hasMore = data && data.length === pageSize && (count === null || allInventory.length < count)
          page++
          
          if (page >= 10) break
        }

        // 2. Obtener todos los productos (boosters, playmats, etc.)
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved")

        if (!productsError && products) {
          // Normalizar productos para el inventario (convertir a formato compatible)
          const normalizedProducts = products.map((product: any) => ({
            id: product.id,
            name: product.name,
            set: product.metadata?.set || null,
            type: null,
            rarity: null,
            number: 0,
            cardNumber: null,
            price: product.price,
            foilPrice: null,
            normalStock: product.stock || 0,
            foilStock: 0,
            image: product.image,
            productType: product.producttype || product.productType, // Manejar ambos nombres
            description: product.description,
            metadata: product.metadata,
          }))
          allInventory = [...allInventory, ...normalizedProducts]
        } else if (productsError) {
          console.log(`⚠ GET /api/inventory - Supabase error (products): ${productsError.message}`)
        }

        if (allInventory.length > 0) {
          dataSource = "supabase"
          console.log(`✓ GET /api/inventory - Using SUPABASE (${allInventory.length} items: ${allInventory.filter(i => (i.productType || "card") === "card").length} cards, ${allInventory.filter(i => (i.productType || "card") !== "card").length} products)`)
          return NextResponse.json({ 
            success: true, 
            inventory: allInventory,
            meta: { source: dataSource, count: allInventory.length } 
          })
        } else {
          console.log("⚠ GET /api/inventory - Supabase returned empty, using MOCK")
        }
      } catch (err) {
        console.log(`⚠ GET /api/inventory - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}, using MOCK`)
      }
    } else {
      console.log("ℹ GET /api/inventory - Supabase not configured, using MOCK")
    }

    // Fallback a mock
    const inventory = mockCards.map(card => ({
      id: card.id,
      name: card.name,
      set: card.set,
      type: card.type,
      rarity: card.rarity,
      number: card.number,
      cardNumber: card.cardNumber,
      price: card.price,
      foilPrice: card.foilPrice,
      normalStock: card.normalStock || 0,
      foilStock: card.foilStock || 0,
      image: card.image,
    }))

    console.log(`✓ GET /api/inventory - Using MOCK (${inventory.length} items)`)
    return NextResponse.json({ 
      success: true, 
      inventory,
      meta: { source: dataSource, count: inventory.length }
    })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    )
  }
}

// POST: Actualizar stock y/o precio de una carta específica
export async function POST(request: Request) {
  // Rate limiting: 50 requests por minuto para operaciones admin
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const { cardId, normalStock, foilStock, price, foilPrice } = body

    console.log(`📝 POST /api/inventory - Request:`, { cardId, normalStock, foilStock, price, foilPrice })

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: "Card ID is required" },
        { status: 400 }
      )
    }

    // Si Supabase Admin está configurado, actualizar allí (con service role)
    if (supabaseAdmin) {
      try {
        const updates: any = { updatedAt: new Date().toISOString() }
        if (normalStock !== undefined) updates.normalStock = Math.max(0, Number(normalStock) || 0)
        if (foilStock !== undefined) updates.foilStock = Math.max(0, Number(foilStock) || 0)
        if (price !== undefined) updates.price = Math.max(0, Number(price) || 0)
        if (foilPrice !== undefined) updates.foilPrice = Math.max(0, Number(foilPrice) || 0)

        console.log(`📝 POST /api/inventory - Updating Supabase (admin):`, updates)

        const { data, error } = await supabaseAdmin
          .from("cards")
          .update(updates)
          .eq("id", cardId)
          .select("id,name,normalStock,foilStock,price,foilPrice")
          .single()

        if (!error && data) {
          console.log(`✓ POST /api/inventory - Updated in SUPABASE:`, data)
          return NextResponse.json({ success: true, card: data, meta: { source: "supabase" } })
        } else {
          // Si Supabase está configurado pero falla, retornar error en lugar de usar mock
          console.log(`⚠ POST /api/inventory - Supabase error:`, error)
          return NextResponse.json(
            { 
              success: false, 
              error: error?.message || "Failed to update in Supabase",
              details: error?.details || null,
              hint: error?.hint || "Check Supabase RLS policies for UPDATE permission"
            },
            { status: 500 }
          )
        }
      } catch (err) {
        console.log(`⚠ POST /api/inventory - Supabase connection error:`, err)
        return NextResponse.json(
          { 
            success: false, 
            error: err instanceof Error ? err.message : "Connection error",
            hint: "Supabase may be unreachable or misconfigured"
          },
          { status: 500 }
        )
      }
    }

    // Solo usar mock si Supabase NO está configurado
    console.log("ℹ POST /api/inventory - Supabase not configured, using MOCK")
    const cardIndex = mockCards.findIndex(card => card.id === cardId)
    
    if (cardIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Card not found" },
        { status: 404 }
      )
    }

    // Actualizar el stock y precios
    if (normalStock !== undefined) {
      mockCards[cardIndex].normalStock = Math.max(0, normalStock)
    }
    if (foilStock !== undefined) {
      mockCards[cardIndex].foilStock = Math.max(0, foilStock)
    }
    if (price !== undefined) {
      mockCards[cardIndex].price = Math.max(0, price)
    }
    if (foilPrice !== undefined) {
      mockCards[cardIndex].foilPrice = Math.max(0, foilPrice)
    }
    mockCards[cardIndex].updatedAt = new Date().toISOString()

    console.log(`✓ POST /api/inventory - Updated in MOCK:`, {
      id: mockCards[cardIndex].id,
      normalStock: mockCards[cardIndex].normalStock,
      foilStock: mockCards[cardIndex].foilStock,
      price: mockCards[cardIndex].price,
      foilPrice: mockCards[cardIndex].foilPrice,
    })
    return NextResponse.json({
      success: true,
      card: {
        id: mockCards[cardIndex].id,
        name: mockCards[cardIndex].name,
        normalStock: mockCards[cardIndex].normalStock,
        foilStock: mockCards[cardIndex].foilStock,
        price: mockCards[cardIndex].price,
        foilPrice: mockCards[cardIndex].foilPrice,
      },
      meta: { source: "mock" }
    })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar stock y/o precios en lote (múltiples cartas)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body // Array de { cardId, normalStock?, foilStock?, price?, foilPrice? }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Updates must be an array" },
        { status: 400 }
      )
    }

    // Si Supabase Admin configurado, intentar batch (iterativo) con service role
    if (supabaseAdmin) {
      try {
        const results: any[] = []
        for (const update of updates) {
          const changes: any = { updatedAt: new Date().toISOString() }
          if (update.normalStock !== undefined) changes.normalStock = Math.max(0, Number(update.normalStock) || 0)
          if (update.foilStock !== undefined) changes.foilStock = Math.max(0, Number(update.foilStock) || 0)
          if (update.price !== undefined) changes.price = Math.max(0, Number(update.price) || 0)
          if (update.foilPrice !== undefined) changes.foilPrice = Math.max(0, Number(update.foilPrice) || 0)
          const { data, error } = await supabaseAdmin
            .from("cards")
            .update(changes)
            .eq("id", update.cardId)
            .select("id,normalStock,foilStock,price,foilPrice")
            .single()
          if (error) {
            results.push({ cardId: update.cardId, success: false, error: error.message })
          } else {
            results.push({ 
              cardId: update.cardId, 
              success: true, 
              normalStock: data?.normalStock, 
              foilStock: data?.foilStock,
              price: data?.price,
              foilPrice: data?.foilPrice
            })
          }
        }
        console.log(`✓ PATCH /api/inventory - Updated ${results.filter(r => r.success).length}/${results.length} in SUPABASE`)
        return NextResponse.json({ success: true, results })
      } catch (err) {
        console.log(`⚠ PATCH /api/inventory - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}`)
      }
    }

    // Fallback a mock
    const results = updates.map(update => {
      const cardIndex = mockCards.findIndex(card => card.id === update.cardId)
      
      if (cardIndex === -1) {
        return { cardId: update.cardId, success: false, error: "Card not found" }
      }

      if (update.normalStock !== undefined) {
        mockCards[cardIndex].normalStock = Math.max(0, update.normalStock)
      }
      if (update.foilStock !== undefined) {
        mockCards[cardIndex].foilStock = Math.max(0, update.foilStock)
      }
      if (update.price !== undefined) {
        mockCards[cardIndex].price = Math.max(0, update.price)
      }
      if (update.foilPrice !== undefined) {
        mockCards[cardIndex].foilPrice = Math.max(0, update.foilPrice)
      }
      mockCards[cardIndex].updatedAt = new Date().toISOString()

      return {
        cardId: update.cardId,
        success: true,
        normalStock: mockCards[cardIndex].normalStock,
        foilStock: mockCards[cardIndex].foilStock,
        price: mockCards[cardIndex].price,
        foilPrice: mockCards[cardIndex].foilPrice,
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

