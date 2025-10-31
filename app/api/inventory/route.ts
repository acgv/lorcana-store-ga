import { NextResponse } from "next/server"
import { mockCards } from "@/lib/mock-data"

// GET: Obtener todas las cartas con su stock
export async function GET() {
  try {
    // Devolver todas las cartas con información de stock
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

    // Buscar la carta en el array
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

