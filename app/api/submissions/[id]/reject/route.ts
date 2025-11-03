import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { rejectedBy, reason } = body

    if (!rejectedBy || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "rejectedBy and reason are required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    const success = await Database.rejectSubmission(params.id, rejectedBy, reason)

    if (!success) {
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
      userId: rejectedBy,
      action: "submission_rejected",
      entityType: "submission",
      entityId: params.id,
      details: {
        reason,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Submission rejected successfully",
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

