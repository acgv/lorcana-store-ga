import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

const MAX_ADDRESSES = 5

// GET - Get user addresses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching addresses:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in GET /api/user/addresses:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST - Create new address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      alias,
      street,
      number,
      commune,
      city,
      region,
      postal_code,
      additional_info,
      is_default,
    } = body

    if (!userId || !alias || !street || !number || !commune || !city || !region) {
      return NextResponse.json(
        {
          success: false,
          error: "userId, alias, street, number, commune, city, and region are required",
        },
        { status: 400 }
      )
    }

    // Check address limit
    const { count } = await supabaseAdmin
      .from("user_addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (count && count >= MAX_ADDRESSES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_ADDRESSES} addresses allowed`,
          code: "LIMIT_EXCEEDED",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .insert({
        user_id: userId,
        alias,
        street,
        number,
        commune,
        city,
        region,
        postal_code: postal_code || null,
        additional_info: additional_info || null,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating address:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Address created successfully",
    })
  } catch (error) {
    console.error("Error in POST /api/user/addresses:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// PATCH - Update address
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      addressId,
      userId,
      alias,
      street,
      number,
      commune,
      city,
      region,
      postal_code,
      additional_info,
      is_default,
    } = body

    if (!addressId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "addressId and userId are required",
        },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (alias !== undefined) updates.alias = alias
    if (street !== undefined) updates.street = street
    if (number !== undefined) updates.number = number
    if (commune !== undefined) updates.commune = commune
    if (city !== undefined) updates.city = city
    if (region !== undefined) updates.region = region
    if (postal_code !== undefined) updates.postal_code = postal_code
    if (additional_info !== undefined) updates.additional_info = additional_info
    if (is_default !== undefined) updates.is_default = is_default

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No fields to update",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_addresses")
      .update(updates)
      .eq("id", addressId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating address:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Address updated successfully",
    })
  } catch (error) {
    console.error("Error in PATCH /api/user/addresses:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const addressId = searchParams.get("addressId")
    const userId = searchParams.get("userId")

    if (!addressId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "addressId and userId are required",
        },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("user_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting address:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    })
  } catch (error) {
    console.error("Error in DELETE /api/user/addresses:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

