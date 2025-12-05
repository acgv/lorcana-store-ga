import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifySupabaseSession } from "@/lib/auth-helpers"

// GET - Get user's collection (owned cards only)
export async function GET(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Verificar autenticación
    const auth = await verifySupabaseSession(request)
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
        },
        { status: auth.status || 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const status = searchParams.get("status") // 'owned' or null (both)

    // ✅ SEGURIDAD: Verificar que el usuario solo acceda a su propia colección
    if (!userId || userId !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only access your own collection",
        },
        { status: 403 }
      )
    }

    // Supabase tiene un límite por defecto de 1000 registros
    // Necesitamos usar paginación para obtener todos los registros
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    // Continuar paginando hasta obtener menos de pageSize items
    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabaseAdmin
        .from("user_collections")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "owned")
        .order("added_at", { ascending: false })
        .range(from, to)

      if (error) {
        console.error("Error fetching collection page:", error)
        throw error
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        console.log(`📊 Collection pagination - Page ${page + 1}: loaded ${data.length} items, total so far: ${allData.length}`)
      }

      // Continuar si obtuvimos exactamente pageSize items (probablemente hay más)
      // Detener si obtuvimos menos (última página) o si no hay datos
      hasMore = data && data.length === pageSize
      
      if (!hasMore) {
        if (data && data.length > 0) {
          console.log(`✅ Collection pagination complete: loaded ${allData.length} items (last page had ${data.length} items)`)
        } else {
          console.log(`✅ Collection pagination complete: loaded ${allData.length} items (no more data)`)
        }
      }
      
      page++

      // Safety limit: no más de 50 páginas (50,000 items máximo)
      if (page >= 50) {
        console.log(`⚠️ Reached safety limit of 50 pages (50,000 items). Loaded ${allData.length} items.`)
        break
      }
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
    // ✅ SEGURIDAD: Verificar autenticación
    const auth = await verifySupabaseSession(request)
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
        },
        { status: auth.status || 401 }
      )
    }

    const body = await request.json()
    const { userId, cardId, status, version, quantity, notes } = body

    // ✅ SEGURIDAD: Verificar que el usuario solo modifique su propia colección
    if (!userId || userId !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only modify your own collection",
        },
        { status: 403 }
      )
    }

    if (!cardId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "cardId and status are required",
        },
        { status: 400 }
      )
    }

    if (status !== "owned") {
      return NextResponse.json(
        {
          success: false,
          error: "status must be 'owned'",
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
    // ✅ SEGURIDAD: Verificar autenticación
    const auth = await verifySupabaseSession(request)
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
        },
        { status: auth.status || 401 }
      )
    }

    const body = await request.json()
    const { userId, cardId, status, version, quantity } = body

    // ✅ SEGURIDAD: Verificar que el usuario solo modifique su propia colección
    if (!userId || userId !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only modify your own collection",
        },
        { status: 403 }
      )
    }

    if (!cardId || !status || !quantity) {
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
    // ✅ SEGURIDAD: Verificar autenticación
    const auth = await verifySupabaseSession(request)
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || "Unauthorized",
        },
        { status: auth.status || 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const cardId = searchParams.get("cardId")
    const status = searchParams.get("status")
    const version = searchParams.get("version") || "normal"

    // ✅ SEGURIDAD: Verificar que el usuario solo modifique su propia colección
    if (!userId || userId !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only modify your own collection",
        },
        { status: 403 }
      )
    }

    if (!cardId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "cardId and status are required",
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

