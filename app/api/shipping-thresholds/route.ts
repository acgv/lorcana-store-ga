import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/db"
import { ApiResponse } from "@/lib/types"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// GET: Obtener umbrales de envío
export async function GET(request: NextRequest) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("shipping_thresholds")
        .select("*")
        .eq("id", "default")
        .single()

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data: data,
        } as ApiResponse)
      }
    }

    // Valores por defecto si no hay en BD
    return NextResponse.json({
      success: true,
      data: {
        id: "default",
        free_shipping_threshold: 50000,
        zone_rm_cost: 5000,
        zone_other_cost: 8000,
        zone_extreme_cost: 12000,
      },
    } as ApiResponse)
  } catch (error) {
    console.error("Error fetching shipping thresholds:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

// PATCH: Actualizar umbrales de envío (solo admin)
export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const { free_shipping_threshold, zone_rm_cost, zone_other_cost, zone_extreme_cost } = body

    if (supabaseAdmin) {
      const updates: any = {}
      if (free_shipping_threshold !== undefined) updates.free_shipping_threshold = Number(free_shipping_threshold)
      if (zone_rm_cost !== undefined) updates.zone_rm_cost = Number(zone_rm_cost)
      if (zone_other_cost !== undefined) updates.zone_other_cost = Number(zone_other_cost)
      if (zone_extreme_cost !== undefined) updates.zone_extreme_cost = Number(zone_extreme_cost)

      const { data, error } = await supabaseAdmin
        .from("shipping_thresholds")
        .update(updates)
        .eq("id", "default")
        .select("*")
        .single()

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data: data,
          message: "Shipping thresholds updated successfully",
        } as ApiResponse)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: error?.message || "Failed to update shipping thresholds",
          } as ApiResponse,
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Supabase not configured",
      } as ApiResponse,
      { status: 500 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

