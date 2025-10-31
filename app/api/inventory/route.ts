import { NextResponse } from "next/server"
import { mockCards } from "@/lib/mock-data"
import { supabase } from "@/lib/db"

// GET: Obtener todas las cartas con su stock
export async function GET() {
  try {
    // Intentar desde Supabase primero si hay configuración
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from("cards")
        .select("id,name,set,type,rarity,number,cardNumber,price,foilPrice,normalStock,foilStock,image")

      if (!error && Array.isArray(data)) {
        return NextResponse.json({ success: true, inventory: data })
      }
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

    return NextResponse.json({ success: true, inventory })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    )
  }
}

// POST: Actualizar stock de una carta específica
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cardId, normalStock, foilStock } = body

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: "Card ID is required" },
        { status: 400 }
      )
    }

    // Si Supabase está configurado, actualizar allí
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const updates: any = { updatedAt: new Date().toISOString() }
      if (normalStock !== undefined) updates.normalStock = Math.max(0, Number(normalStock) || 0)
      if (foilStock !== undefined) updates.foilStock = Math.max(0, Number(foilStock) || 0)

      const { data, error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId)
        .select("id,name,normalStock,foilStock")
        .single()

      if (!error && data) {
        return NextResponse.json({ success: true, card: data })
      }
    }

    // Fallback a mock: Buscar la carta en el array
    const cardIndex = mockCards.findIndex(card => card.id === cardId)
    
    if (cardIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Card not found" },
        { status: 404 }
      )
    }

    // Actualizar el stock
    if (normalStock !== undefined) {
      mockCards[cardIndex].normalStock = Math.max(0, normalStock)
    }
    if (foilStock !== undefined) {
      mockCards[cardIndex].foilStock = Math.max(0, foilStock)
    }
    mockCards[cardIndex].updatedAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      card: {
        id: mockCards[cardIndex].id,
        name: mockCards[cardIndex].name,
        normalStock: mockCards[cardIndex].normalStock,
        foilStock: mockCards[cardIndex].foilStock,
      }
    })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar stock en lote (múltiples cartas)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body // Array de { cardId, normalStock?, foilStock? }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Updates must be an array" },
        { status: 400 }
      )
    }

    // Si Supabase configurado, intentar batch (iterativo)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const results: any[] = []
      for (const update of updates) {
        const changes: any = { updatedAt: new Date().toISOString() }
        if (update.normalStock !== undefined) changes.normalStock = Math.max(0, Number(update.normalStock) || 0)
        if (update.foilStock !== undefined) changes.foilStock = Math.max(0, Number(update.foilStock) || 0)
        const { data, error } = await supabase
          .from("cards")
          .update(changes)
          .eq("id", update.cardId)
          .select("id,normalStock,foilStock")
          .single()
        if (error) {
          results.push({ cardId: update.cardId, success: false, error: error.message })
        } else {
          results.push({ cardId: update.cardId, success: true, normalStock: data?.normalStock, foilStock: data?.foilStock })
        }
      }
      return NextResponse.json({ success: true, results })
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
      mockCards[cardIndex].updatedAt = new Date().toISOString()

      return {
        cardId: update.cardId,
        success: true,
        normalStock: mockCards[cardIndex].normalStock,
        foilStock: mockCards[cardIndex].foilStock,
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

