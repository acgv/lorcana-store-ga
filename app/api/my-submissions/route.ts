import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import type { ApiResponse, CardSubmission } from "@/lib/types"

// GET - Get submissions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (passed from client)
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase admin not configured")
    }

    // Query submissions for this user
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("submittedat", { ascending: false })

    if (error) {
      console.error("Error fetching user submissions:", error)
      throw error
    }

    // Map from database format to application format
    const submissions: CardSubmission[] = (data || []).map((row: any) => ({
      id: row.id,
      card: row.card,
      status: row.status,
      submittedBy: row.submittedby,
      submittedAt: row.submittedat,
      reviewedBy: row.reviewedby || undefined,
      reviewedAt: row.reviewedat || undefined,
      rejectionReason: row.rejectionreason || undefined,
      images: row.images || [],
      metadata: row.metadata || {},
    }))

    return NextResponse.json({
      success: true,
      data: submissions,
    } as ApiResponse<CardSubmission[]>)
  } catch (error) {
    console.error("Error in my-submissions API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

