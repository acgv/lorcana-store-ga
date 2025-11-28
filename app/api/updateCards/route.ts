import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/db"
import type { ApiResponse, Card } from "@/lib/types"
import { verifyAdminSession } from "@/lib/auth-helpers"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// Direct card update endpoint (bypasses approval workflow)
// Used for bulk updates or automated syncs
// ✅ SEGURIDAD: Requiere sesión autenticada con rol admin
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // ✅ VALIDACIÓN DE SEGURIDAD: Verificar sesión de admin
    const auth = await verifyAdminSession(request)
    
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error)
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        } as ApiResponse,
        { status: auth.status }
      )
    }

    console.log('✅ Admin authenticated:', auth.email)

    const body = await request.json()
    const { cards } = body
    
    // ✅ Usar el userId del usuario autenticado (no confiar en el del body)
    const userId = auth.userId

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "cards array is required and cannot be empty",
        } as ApiResponse,
        { status: 400 }
      )
    }

    const results = {
      created: [] as Card[],
      updated: [] as Card[],
      errors: [] as { card: any; error: string }[],
    }

    for (const cardData of cards) {
      try {
        // Check if card exists
        const existing = await Database.getCardById(cardData.id)

        if (existing) {
          // Update existing card
          const updated = await Database.updateCard(cardData.id, {
            ...cardData,
            status: "approved",
          })
          if (updated) {
            results.updated.push(updated)
            await Database.createLog({
              userId,
              action: "card_updated",
              entityType: "card",
              entityId: cardData.id,
            })
          }
        } else {
          // Create new card
          const created = await Database.createCard({
            ...cardData,
            status: "approved",
          })
          results.created.push(created)
          await Database.createLog({
            userId,
            action: "card_created",
            entityType: "card",
            entityId: created.id,
          })
        }
      } catch (error) {
        results.errors.push({
          card: cardData,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Processed ${cards.length} cards: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`,
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

