import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

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

    // Supabase tiene un límite por defecto de 1000 registros
    // Necesitamos usar paginación para obtener todos los registros
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      let query = supabaseAdmin
        .from("user_collections")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .range(from, to)

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error, count } = await query.order("added_at", { ascending: false })

      if (error) {
        console.error("Error fetching collection page:", error)
        throw error
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data]
      }

      // Verificar si hay más páginas
      hasMore = data && data.length === pageSize && (count === null || allData.length < count)
      page++

      // Safety limit: no más de 10 páginas (10,000 items máximo)
      if (page >= 10) break
    }

    const data = allData

    // Log para debugging
    if (data) {
      const setsCount = data.reduce((acc: Record<string, number>, item: any) => {
        // Extraer set del card_id (ej: "fab-0" -> "fab", "tfc-1" -> "tfc")
        const setId = item.card_id?.split("-")[0] || "unknown"
        acc[setId] = (acc[setId] || 0) + 1
        return acc
      }, {})
      console.log(`📊 Collection loaded for user ${userId}:`, {
        total: data.length,
        bySet: setsCount
      })
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
    const { userId, cardId, status, version, quantity, notes } = body

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

    if (version && !["normal", "foil"].includes(version)) {
      return NextResponse.json(
        {
          success: false,
          error: "version must be 'normal' or 'foil'",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_collections")
      .insert({
        user_id: userId,
        card_id: cardId,
        status,
        version: version || 'normal',
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

// PUT - Update quantity of a card in collection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, cardId, status, version, quantity } = body

    if (!userId || !cardId || !status || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "userId, cardId, status, and quantity are required",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_collections")
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .eq("status", status)
      .eq("version", version || "normal")
      .select()
      .single()

    if (error) {
      console.error("Error updating collection:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Quantity updated",
    })
  } catch (error) {
    console.error("Error in PUT /api/my-collection:", error)
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
    const version = searchParams.get("version") || "normal"

    if (!userId || !cardId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "userId, cardId, and status are required",
        },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("user_collections")
      .delete()
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .eq("status", status)
      .eq("version", version)

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

