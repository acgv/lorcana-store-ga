import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

// GET - Get user's collection (owned and wanted cards)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const status = searchParams.get("status") // 'owned' or 'wanted' or null (both)

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      )
    }

    let query = supabase
      .from("user_collections")
      .select("*")
      .eq("user_id", userId)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query.order("added_at", { ascending: false })

    if (error) {
      console.error("Error fetching collection:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in GET /api/my-collection:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST - Add card to user's collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, cardId, status, quantity, notes } = body

    if (!userId || !cardId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "userId, cardId, and status are required",
        },
        { status: 400 }
      )
    }

    if (!["owned", "wanted"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "status must be 'owned' or 'wanted'",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("user_collections")
      .insert({
        user_id: userId,
        card_id: cardId,
        status,
        quantity: quantity || 1,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate entry
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Card already in collection",
            code: "DUPLICATE",
          },
          { status: 409 }
        )
      }
      console.error("Error adding to collection:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Card added to collection",
    })
  } catch (error) {
    console.error("Error in POST /api/my-collection:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove card from collection
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const cardId = searchParams.get("cardId")
    const status = searchParams.get("status")

    if (!userId || !cardId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "userId, cardId, and status are required",
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("user_collections")
      .delete()
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .eq("status", status)

    if (error) {
      console.error("Error removing from collection:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Card removed from collection",
    })
  } catch (error) {
    console.error("Error in DELETE /api/my-collection:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

