import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"
import type { ApiResponse, Card } from "@/lib/types"

// GET - Get a single card by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = params.id
    console.log("🔍 Fetching card with ID:", cardId)

    // Query Supabase for the card
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single()

    console.log("📊 Supabase response:", { 
      found: !!data, 
      error: error?.message,
      cardId 
    })

    if (error || !data) {
      console.error("❌ Error fetching card:", error)
      
      // Try alternative query to see if card exists with different ID format
      const { data: searchData, error: searchError } = await supabase
        .from("cards")
        .select("id, name")
        .ilike("id", `%${cardId}%`)
        .limit(5)
      
      console.log("🔍 Similar cards found:", searchData)
      
      return NextResponse.json(
        {
          success: false,
          error: "Card not found",
          debug: {
            requestedId: cardId,
            similarCards: searchData?.map(c => c.id) || [],
          }
        } as ApiResponse,
        { status: 404 }
      )
    }

    // Map from database format to application format
    const card: Card = {
      id: data.id,
      name: data.name,
      set: data.set,
      rarity: data.rarity,
      type: data.type,
      cardNumber: data.cardnumber || data.card_number,
      description: data.description,
      image: data.image,
      language: data.language || "EN",
      price: data.price,
      foilPrice: data.foilprice || data.foil_price,
      normalStock: data.normalstock || data.normal_stock || 0,
      foilStock: data.foilstock || data.foil_stock || 0,
      createdAt: data.createdat || data.created_at,
      updatedAt: data.updatedat || data.updated_at,
    }

    return NextResponse.json({
      success: true,
      data: card,
    } as ApiResponse<Card>)
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}
