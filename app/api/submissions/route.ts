import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, CardSubmission } from "@/lib/types"

// GET - Get all submissions (with optional status or id filter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || undefined
    const id = searchParams.get("id") || undefined

    // If searching by ID, use getSubmissionById
    if (id) {
      const submission = await Database.getSubmissionById(id)
      
      if (!submission) {
        return NextResponse.json(
          {
            success: false,
            error: "Submission not found",
          } as ApiResponse,
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: [submission], // Return as array for consistency
      } as ApiResponse<CardSubmission[]>)
    }

    // Otherwise, get all submissions (optionally filtered by status)
    const submissions = await Database.getSubmissions(status)

    const response: ApiResponse<CardSubmission[]> = {
      success: true,
      data: submissions,
    }

    return NextResponse.json(response)
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

// POST - Create a new submission (authenticated users only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { card, submittedBy, userId, userName, images, metadata } = body

    // Validar campos requeridos
    if (!card || !submittedBy || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Card data, submittedBy email, and userId are required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Crear submission con user_id y user_name
    const newSubmission = await Database.createSubmission({
      card,
      status: "pending",
      submittedBy,
      userId, // ⭐ User ID from authenticated user
      userName, // ⭐ User name for display
      submittedAt: new Date().toISOString(),
      images: images || [],
      metadata: metadata || { source: "web" },
    })

    // Log activity
    await Database.createLog({
      userId: userId || submittedBy,
      action: "submission_created",
      entityType: "submission",
      entityId: newSubmission.id,
      details: {
        cardName: card.name,
        source: metadata?.source || "web",
        userName,
      },
    })

    return NextResponse.json({
      success: true,
      data: newSubmission,
      message: "Submission created successfully",
    } as ApiResponse<CardSubmission>)
  } catch (error) {
    console.error("Error creating submission:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

// PUT - Update submission (used for editing before approval)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Submission ID is required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    const updated = await Database.updateSubmission(id, updates)

    if (!updated) {
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
      userId: body.userId || "admin",
      action: "submission_updated",
      entityType: "submission",
      entityId: id,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Submission updated successfully",
    } as ApiResponse<CardSubmission>)
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

