import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, Card } from "@/lib/types"

// GET - Get a single card by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = params.id

    const card = await Database.getCardById(cardId)

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Card not found",
        } as ApiResponse,
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: card,
    } as ApiResponse<Card>)
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}
