import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import { mockCards } from "@/lib/mock-data"
import type { ApiResponse, Card } from "@/lib/types"

// Initialize database with mock data
Database.initialize(mockCards as any)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = {
      status: searchParams.get("status") || "approved",
      type: searchParams.get("type") || undefined,
      set: searchParams.get("set") || undefined,
      rarity: searchParams.get("rarity") || undefined,
      language: searchParams.get("language") || undefined,
    }

    const cards = await Database.getCards(filters)

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

    const newCard = await Database.createCard(card)

    // Log activity
    await Database.createLog({
      userId: "system",
      action: "card_created",
      entityType: "card",
      entityId: newCard.id,
    })

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

