import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyAdmin } from "@/lib/auth"

// Precios estándar por rareza (en CLP) - igual que en el script de importación
function getStandardPriceCLP(rarity: string): number {
  const standardPrices: Record<string, number> = {
    common: 500,       // $500 CLP
    uncommon: 1000,    // $1,000 CLP
    rare: 2500,        // $2,500 CLP
    superRare: 5000,   // $5,000 CLP
    legendary: 30000,  // $30,000 CLP
    enchanted: 50000,  // $50,000 CLP
  }
  
  return standardPrices[rarity] || 500
}

// POST: Revertir precios de un set a valores estándar
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
    const { set } = body

    if (!set) {
      return NextResponse.json(
        { success: false, error: "Set is required (e.g., 'firstChapter')" },
        { status: 400 }
      )
    }

    console.log(`🔄 Revertiendo precios del set: ${set}`)

    // Obtener todas las cartas del set
    const { data: cards, error: fetchError } = await supabaseAdmin
      .from("cards")
      .select("id, name, rarity, price, foilPrice")
      .eq("set", set)
      .eq("status", "approved")

    if (fetchError) {
      console.error("Error fetching cards:", fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { success: false, error: `No se encontraron cartas para el set: ${set}` },
        { status: 404 }
      )
    }

    console.log(`📊 Encontradas ${cards.length} cartas del set ${set}`)

    // Preparar actualizaciones
    const updates = cards.map((card) => {
      const standardPrice = getStandardPriceCLP(card.rarity || "common")
      const standardFoilPrice = Math.round(standardPrice * 1.6) // Foil es 1.6x el precio normal

      return {
        id: card.id,
        name: card.name,
        oldPrice: card.price,
        oldFoilPrice: card.foilPrice,
        newPrice: standardPrice,
        newFoilPrice: standardFoilPrice,
        rarity: card.rarity,
      }
    })

    // Actualizar precios en lotes para evitar timeouts
    const BATCH_SIZE = 50
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ cardId: string; error: string }> = []

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE)

      for (const update of batch) {
        try {
          const { error: updateError } = await supabaseAdmin
            .from("cards")
            .update({
              price: update.newPrice,
              foilPrice: update.newFoilPrice,
            })
            .eq("id", update.id)

          if (updateError) {
            failedCount++
            errors.push({
              cardId: update.id,
              error: updateError.message,
            })
            console.error(`❌ Error actualizando ${update.name} (${update.id}):`, updateError)
          } else {
            successCount++
            if (successCount <= 5 || successCount % 50 === 0) {
              console.log(
                `✅ ${update.name}: $${update.oldPrice} → $${update.newPrice} CLP (foil: $${update.oldFoilPrice} → $${update.newFoilPrice} CLP)`
              )
            }
          }
        } catch (error) {
          failedCount++
          errors.push({
            cardId: update.id,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      // Pequeño delay entre lotes
      if (i + BATCH_SIZE < updates.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(
      `✅ Reversión completada: ${successCount} exitosas, ${failedCount} fallidas`
    )

    return NextResponse.json({
      success: failedCount === 0,
      message: `Precios revertidos: ${successCount} de ${updates.length} cartas`,
      stats: {
        total: updates.length,
        success: successCount,
        failed: failedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in revert-set-prices:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

