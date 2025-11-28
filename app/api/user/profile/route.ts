import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// Helper function to split full name into first and last name
function splitName(fullName: string | null | undefined): { first_name: string | null; last_name: string | null } {
  if (!fullName || fullName.trim() === "") {
    return { first_name: null, last_name: null }
  }

  const parts = fullName.trim().split(/\s+/)
  
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: null }
  } else if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1] }
  } else {
    // More than 2 parts: first is first_name, rest is last_name
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(" ")
    }
  }
}

// GET - Get user profile (auto-creates from auth.users if doesn't exist)
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

    // Try to get existing profile
    let { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching profile:", error)
      throw error
    }

    // If profile doesn't exist, try to create it from auth.users data
    if (!data) {
      // Get user data from auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!authError && authUser?.user) {
        const metadata = authUser.user.user_metadata || {}
        const fullName = metadata.name || metadata.full_name || null
        
        if (fullName) {
          const { first_name, last_name } = splitName(fullName)
          
          // Create profile with data from auth.users
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from("user_profiles")
            .insert({
              user_id: userId,
              first_name,
              last_name,
            })
            .select()
            .single()

          if (!createError && newProfile) {
            data = newProfile
            console.log(`✅ Auto-created profile for user ${userId} from auth.users`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: data || { user_id: userId },
    })
  } catch (error) {
    console.error("Error in GET /api/user/profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST - Create user profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, first_name, last_name, birth_date, document_type, document_number } = body

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
      .from("user_profiles")
      .insert({
        user_id: userId,
        first_name: first_name || null,
        last_name: last_name || null,
        birth_date: birth_date || null,
        document_type: document_type || null,
        document_number: document_number || null,
      })
      .select()
      .single()

    if (error) {
      // Check if profile already exists
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Profile already exists. Use PATCH to update.",
            code: "DUPLICATE",
          },
          { status: 409 }
        )
      }
      console.error("Error creating profile:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Profile created successfully",
    })
  } catch (error) {
    console.error("Error in POST /api/user/profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, first_name, last_name, birth_date, document_type, document_number } = body

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (first_name !== undefined) updates.first_name = first_name
    if (last_name !== undefined) updates.last_name = last_name
    if (birth_date !== undefined) updates.birth_date = birth_date
    if (document_type !== undefined) updates.document_type = document_type
    if (document_number !== undefined) updates.document_number = document_number

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
      .from("user_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      // If profile doesn't exist, create it
      if (error.code === "PGRST116") {
        const { data: newData, error: createError } = await supabaseAdmin
          .from("user_profiles")
          .insert({
            user_id: userId,
            ...updates,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
          throw createError
        }

        return NextResponse.json({
          success: true,
          data: newData,
          message: "Profile created successfully",
        })
      }

      console.error("Error updating profile:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("Error in PATCH /api/user/profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

