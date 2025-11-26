import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"
import { ApiResponse } from "@/lib/types"

// GET: Obtener un producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        } as ApiResponse,
        { status: 400 }
      )
    }
    
    console.log(`🔍 GET /api/products/${id} - Buscando producto...`)

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("status", "approved")
          .single()

        if (!error && data) {
          return NextResponse.json({
            success: true,
            data: data,
            meta: { source: "supabase" },
          } as ApiResponse)
        } else {
          console.log(`⚠ GET /api/products/${id} - Supabase error: ${error?.message || "unknown"}`)
        }
      } catch (err) {
        console.log(`⚠ GET /api/products/${id} - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}`)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Product not found",
      } as ApiResponse,
      { status: 404 }
    )
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

