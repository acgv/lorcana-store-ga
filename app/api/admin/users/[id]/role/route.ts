import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// POST - Assign admin role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = id

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format. Expected UUID.",
        },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase admin not configured")
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError) {
      console.error("Error fetching user:", userError)
      // Si el error es que no es un UUID válido, ya lo validamos antes, pero por si acaso
      if (userError.message.includes("UUID")) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid user ID: ${userError.message}`,
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: userError.message || "User not found",
        },
        { status: 404 }
      )
    }

    if (!user || !user.user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      )
    }

    // Check if user has password set (not OAuth only)
    const userHasPassword = user.user.encrypted_password !== null

    // Insert admin role (skip if already exists)
    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "admin",
      created_at: new Date().toISOString(),
    })

    // If error is duplicate key (user already has admin role), that's fine
    if (insertError && !insertError.message.includes("duplicate key")) {
      console.error("Error assigning admin role:", insertError)
      throw insertError
    }

    // If user doesn't have password (OAuth only), generate a temporary password
    let temporaryPassword: string | null = null
    if (!userHasPassword) {
      // Generate a secure random password
      temporaryPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "!@#"
      
      // Update user password with temporary password
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: temporaryPassword,
      })

      if (passwordError) {
        console.error("Error setting temporary password:", passwordError)
        // Don't fail the admin assignment, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: userHasPassword 
        ? "Admin role assigned successfully. User can login with their existing password."
        : "Admin role assigned successfully. A temporary password has been set.",
      temporaryPassword: temporaryPassword, // Only sent if password was set
      note: !userHasPassword 
        ? "The user can now login with email/password OR continue using Google OAuth."
        : undefined,
    })
  } catch (error) {
    console.error("Error in POST /api/admin/users/[id]/role:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove admin role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = id

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format. Expected UUID.",
        },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase admin not configured")
    }

    // Delete admin role
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin")

    if (error) {
      console.error("Error removing admin role:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Admin role removed successfully",
    })
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[id]/role:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

