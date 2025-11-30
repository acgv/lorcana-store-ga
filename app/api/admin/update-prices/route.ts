import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyAdmin } from "@/lib/auth"

// POST: Actualizar precios de cartas (individual o masivo)
export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    const body = await request.json()
    const { cardId, price, foilPrice, marketPriceUSD, marketFoilPriceUSD, updates } = body

    // Si se pasa un array de updates, es actualización masiva
    if (updates && Array.isArray(updates)) {
      console.log(`📝 POST /api/admin/update-prices - Actualización masiva: ${updates.length} cartas`)
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ cardId: string; error: string }>,
      }

      // Procesar cada actualización
      for (const update of updates) {
        const { cardId: id, price: p, foilPrice: fp, marketPriceUSD: mpUSD, marketFoilPriceUSD: mfpUSD } = update
        
        if (!id) {
          results.failed++
          results.errors.push({ cardId: id || "unknown", error: "Card ID is required" })
          continue
        }

        try {
          const updateData: any = {}
          if (p !== undefined && p !== null) {
            updateData.price = Math.max(0, Number(p) || 0)
          }
          if (fp !== undefined && fp !== null) {
            updateData.foilPrice = Math.max(0, Number(fp) || 0)
          }
          if (mpUSD !== undefined && mpUSD !== null) {
            updateData.marketPriceUSD = Math.max(0, Number(mpUSD) || 0)
          }
          if (mfpUSD !== undefined && mfpUSD !== null) {
            updateData.marketFoilPriceUSD = Math.max(0, Number(mfpUSD) || 0)
          }

          if (Object.keys(updateData).length === 0) {
            results.failed++
            results.errors.push({ cardId: id, error: "No valid price fields to update" })
            continue
          }

          const { error } = await supabaseAdmin
            .from("cards")
            .update(updateData)
            .eq("id", id)

          if (error) {
            results.failed++
            results.errors.push({ cardId: id, error: error.message })
          } else {
            results.success++
          }
        } catch (error) {
          results.failed++
          results.errors.push({
            cardId: id,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      return NextResponse.json({
        success: results.failed === 0,
        message: `Actualizados ${results.success} de ${updates.length} precios`,
        results,
      })
    }

    // Actualización individual
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: "Card ID is required for individual update" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (price !== undefined && price !== null) {
      updateData.price = Math.max(0, Number(price) || 0)
    }
    if (foilPrice !== undefined && foilPrice !== null) {
      updateData.foilPrice = Math.max(0, Number(foilPrice) || 0)
    }
    if (marketPriceUSD !== undefined && marketPriceUSD !== null) {
      updateData.marketPriceUSD = Math.max(0, Number(marketPriceUSD) || 0)
    }
    if (marketFoilPriceUSD !== undefined && marketFoilPriceUSD !== null) {
      updateData.marketFoilPriceUSD = Math.max(0, Number(marketFoilPriceUSD) || 0)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid price fields to update" },
        { status: 400 }
      )
    }

    console.log(`📝 POST /api/admin/update-prices - Actualizando carta ${cardId}:`, updateData)

    const { data, error } = await supabaseAdmin
      .from("cards")
      .update(updateData)
      .eq("id", cardId)
      .select()

    if (error) {
      console.error(`❌ Error actualizando precio de ${cardId}:`, error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to update price",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Precio actualizado correctamente",
      data: data?.[0],
    })
  } catch (error) {
    console.error("Error in update-prices:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

