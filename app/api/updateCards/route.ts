import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, Card } from "@/lib/types"

// Direct card update endpoint (bypasses approval workflow)
// Used for bulk updates or automated syncs
export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Invalid API key",
        } as ApiResponse,
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cards, userId = "system" } = body

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "cards array is required and cannot be empty",
        } as ApiResponse,
        { status: 400 }
      )
    }

    const results = {
      created: [] as Card[],
      updated: [] as Card[],
      errors: [] as { card: any; error: string }[],
    }

    for (const cardData of cards) {
      try {
        // Check if card exists
        const existing = await Database.getCardById(cardData.id)

        if (existing) {
          // Update existing card
          const updated = await Database.updateCard(cardData.id, {
            ...cardData,
            status: "approved",
          })
          if (updated) {
            results.updated.push(updated)
            await Database.createLog({
              userId,
              action: "card_updated",
              entityType: "card",
              entityId: cardData.id,
            })
          }
        } else {
          // Create new card
          const created = await Database.createCard({
            ...cardData,
            status: "approved",
          })
          results.created.push(created)
          await Database.createLog({
            userId,
            action: "card_created",
            entityType: "card",
            entityId: created.id,
          })
        }
      } catch (error) {
        results.errors.push({
          card: cardData,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Processed ${cards.length} cards: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`,
    } as ApiResponse)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

