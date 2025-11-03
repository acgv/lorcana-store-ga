import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// POST: Login de admin
export async function POST(request: Request) {
  // Rate limiting: 5 intentos por minuto
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.login)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Usar Supabase Auth
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.log(`❌ Login failed:`, error.message)
          return NextResponse.json(
            { success: false, error: "Invalid credentials" },
            { status: 401 }
          )
        }

        if (data.user && data.session) {
          console.log(`✅ Login successful: ${data.user.email}`)
          return NextResponse.json({
            success: true,
            token: data.session.access_token,
            user: {
              id: data.user.id,
              email: data.user.email,
            },
          })
        }
      } catch (err) {
        console.error("Supabase auth error:", err)
        return NextResponse.json(
          { success: false, error: "Authentication service unavailable" },
          { status: 503 }
        )
      }
    }

    // Si Supabase Auth no está configurado, mostrar error
    return NextResponse.json(
      { 
        success: false, 
        error: "Authentication not configured. Please set up Supabase Auth and SUPABASE_SERVICE_ROLE_KEY." 
      },
      { status: 503 }
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

