import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/db"
import { ApiResponse } from "@/lib/types"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// GET: Obtener promociones activas (público) o todas (admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get("includeInactive") === "true"

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from("promotions")
          .select("*")

        // Si no se solicita incluir inactivas, solo mostrar activas
        if (!includeInactive) {
          query = query.eq("is_active", true)
        }

        const { data, error } = await query.order("created_at", { ascending: false })

        if (!error && data) {
          return NextResponse.json({
            success: true,
            data: data,
            meta: { source: "supabase", count: data.length },
          } as ApiResponse)
        } else {
          console.error("Error fetching promotions:", error)
          return NextResponse.json({
            success: false,
            error: error?.message || "Unknown error",
            data: [],
          } as ApiResponse, { status: 500 })
        }
      } catch (err) {
        console.error("Supabase connection error:", err)
      }
    }

    return NextResponse.json({
      success: true,
      data: [],
      meta: { source: "empty" },
    } as ApiResponse)
  } catch (error) {
    console.error("Error fetching promotions:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

// PATCH: Actualizar promoción (solo admin)
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Promotion ID is required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured",
        } as ApiResponse,
        { status: 500 }
      )
    }

    // Actualizar promoción
    const { data, error } = await supabaseAdmin
      .from("promotions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating promotion:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        } as ApiResponse,
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: "Promotion updated successfully",
    } as ApiResponse)
  } catch (error) {
    console.error("Error updating promotion:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

