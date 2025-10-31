import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, CardSubmission } from "@/lib/types"

// API endpoint for mobile app to submit card data for review
export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.MOBILE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Invalid API key",
        } as ApiResponse,
        { status: 401 }
      )
    }

    const body = await request.json()
    const { card, images, source, deviceInfo, ocrConfidence } = body

    // Validate required fields
    if (!card || !card.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required card data",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Create submission
    const submission = await Database.createSubmission({
      card: {
        ...card,
        language: card.language || "en",
        version: card.version || "normal",
      },
      status: "pending",
      submittedBy: body.userId || "mobile_user",
      submittedAt: new Date().toISOString(),
      images: images || [],
      metadata: {
        source: source || "mobile",
        deviceInfo,
        ocrConfidence,
      },
    })

    // Log activity
    await Database.createLog({
      userId: body.userId || "mobile_user",
      action: "submission_created",
      entityType: "submission",
      entityId: submission.id,
      details: {
        cardName: card.name,
        source,
      },
    })

    const response: ApiResponse<CardSubmission> = {
      success: true,
      data: submission,
      message: "Card data submitted successfully. Awaiting admin review.",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Staging API error:", error)
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// GET endpoint to check submission status
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.MOBILE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Invalid API key",
        } as ApiResponse,
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const submissionId = searchParams.get("id")

    if (submissionId) {
      const submission = await Database.getSubmissionById(submissionId)
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
        data: submission,
      } as ApiResponse<CardSubmission>)
    }

    // Return user's submissions
    const userId = searchParams.get("userId")
    const submissions = await Database.getSubmissions()
    const filtered = userId ? submissions.filter((s) => s.submittedBy === userId) : submissions

    return NextResponse.json({
      success: true,
      data: filtered,
    } as ApiResponse<CardSubmission[]>)
  } catch (error) {
    console.error("Staging GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

