import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, ActivityLog } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "100")

    const logs = await Database.getLogs(limit)

    const response: ApiResponse<ActivityLog[]> = {
      success: true,
      data: logs,
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

