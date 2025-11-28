import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

const MAX_PHONES = 5

// Validar formato de teléfono chileno: +56 9 1234 5678
function validatePhoneFormat(phone: string): boolean {
  // Formato: +56 9 1234 5678 o +56 9 12345678
  const phoneRegex = /^\+56\s?9\s?\d{4}\s?\d{4}$/
  return phoneRegex.test(phone.replace(/\s+/g, " "))
}

// GET - Get user phones
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
      .from("user_phones")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching phones:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Error in GET /api/user/phones:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST - Create new phone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, phone_number, phone_type, country_code, is_default } = body

    if (!userId || !phone_number) {
      return NextResponse.json(
        {
          success: false,
          error: "userId and phone_number are required",
        },
        { status: 400 }
      )
    }

    // Validar formato de teléfono
    if (!validatePhoneFormat(phone_number)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone format. Expected: +56 9 1234 5678",
          code: "INVALID_FORMAT",
        },
        { status: 400 }
      )
    }

    // Validar phone_type
    if (phone_type && !["mobile", "home", "work", "other"].includes(phone_type)) {
      return NextResponse.json(
        {
          success: false,
          error: "phone_type must be one of: mobile, home, work, other",
        },
        { status: 400 }
      )
    }

    // Check phone limit
    const { count } = await supabaseAdmin
      .from("user_phones")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (count && count >= MAX_PHONES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_PHONES} phones allowed`,
          code: "LIMIT_EXCEEDED",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("user_phones")
      .insert({
        user_id: userId,
        phone_number: phone_number.trim(),
        phone_type: phone_type || "mobile",
        country_code: country_code || "+56",
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating phone:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Phone created successfully",
    })
  } catch (error) {
    console.error("Error in POST /api/user/phones:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// PATCH - Update phone
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneId, userId, phone_number, phone_type, country_code, is_default } = body

    if (!phoneId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "phoneId and userId are required",
        },
        { status: 400 }
      )
    }

    // Validar formato si se actualiza phone_number
    if (phone_number && !validatePhoneFormat(phone_number)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone format. Expected: +56 9 1234 5678",
          code: "INVALID_FORMAT",
        },
        { status: 400 }
      )
    }

    // Validar phone_type
    if (phone_type && !["mobile", "home", "work", "other"].includes(phone_type)) {
      return NextResponse.json(
        {
          success: false,
          error: "phone_type must be one of: mobile, home, work, other",
        },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (phone_number !== undefined) updates.phone_number = phone_number.trim()
    if (phone_type !== undefined) updates.phone_type = phone_type
    if (country_code !== undefined) updates.country_code = country_code
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
      .from("user_phones")
      .update(updates)
      .eq("id", phoneId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating phone:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Phone updated successfully",
    })
  } catch (error) {
    console.error("Error in PATCH /api/user/phones:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete phone
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phoneId = searchParams.get("phoneId")
    const userId = searchParams.get("userId")

    if (!phoneId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "phoneId and userId are required",
        },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("user_phones")
      .delete()
      .eq("id", phoneId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting phone:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Phone deleted successfully",
    })
  } catch (error) {
    console.error("Error in DELETE /api/user/phones:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

