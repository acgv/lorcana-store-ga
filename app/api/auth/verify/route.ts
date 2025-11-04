import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// POST: Verificar token de admin
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Auth service not configured" },
        { status: 503 }
      )
    }

    // Verificar token con Supabase Admin
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    // Verificar que el usuario tiene rol de admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single()

    if (!roleData || roleData.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin role required" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

