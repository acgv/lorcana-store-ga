import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// POST: Verificar token de admin
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Authorization header provided")
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    if (!supabaseAdmin) {
      console.error("❌ Supabase Admin not configured")
      return NextResponse.json(
        { success: false, error: "Auth service not configured" },
        { status: 503 }
      )
    }

    console.log("🔍 Verifying token...")

    // Verificar token con Supabase Admin
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error) {
      console.log("❌ Supabase auth error:", error.message)
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    if (!data.user) {
      console.log("❌ No user data returned")
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      )
    }

    console.log("✅ Token valid for user:", data.user.email)

    // Verificar que el usuario tiene rol de admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single()

    if (roleError) {
      console.log("❌ Error checking user role:", roleError.message)
      return NextResponse.json(
        { success: false, error: "Error checking permissions" },
        { status: 403 }
      )
    }

    if (!roleData || roleData.role !== "admin") {
      console.log("❌ User does not have admin role:", data.user.email)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin role required" },
        { status: 403 }
      )
    }

    console.log("✅ User has admin role, verification successful")

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    console.error("❌ Token verification exception:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

