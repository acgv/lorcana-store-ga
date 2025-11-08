import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// GET - List all users with their roles
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin not configured")
    }

    // Get all users from auth.users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      console.error("Error fetching users:", usersError)
      throw usersError
    }

    // Get all user roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")

    if (rolesError) {
      console.error("Error fetching roles:", rolesError)
      throw rolesError
    }

    // Combine users with their roles
    const usersWithRoles = users.users.map((user) => {
      const userRole = roles?.find((r) => r.user_id === user.id)
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        avatar: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider || "email",
        role: userRole?.role || null,
        roleAssignedAt: userRole?.created_at || null,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      }
    })

    // Sort: admins first, then by email
    usersWithRoles.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1
      if (a.role !== "admin" && b.role === "admin") return 1
      return (a.email || "").localeCompare(b.email || "")
    })

    return NextResponse.json({
      success: true,
      data: usersWithRoles,
    })
  } catch (error) {
    console.error("Error in /api/admin/users:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

