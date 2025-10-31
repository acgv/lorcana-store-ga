import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, CardSubmission } from "@/lib/types"

// GET - Get all submissions (with optional status filter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || undefined

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

