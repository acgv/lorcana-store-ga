import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, Card } from "@/lib/types"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { approvedBy } = body

    if (!approvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "approvedBy is required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    const card = await Database.approveSubmission(params.id, approvedBy)

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Submission not found",
        } as ApiResponse,
        { status: 404 }
      )
    }

    // Log activity
    await Database.createLog({
      userId: approvedBy,
      action: "submission_approved",
      entityType: "submission",
      entityId: params.id,
      details: {
        cardId: card.id,
        cardName: card.name,
      },
    })

    return NextResponse.json({
      success: true,
      data: card,
      message: "Submission approved and card published successfully",
    } as ApiResponse<Card>)
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

