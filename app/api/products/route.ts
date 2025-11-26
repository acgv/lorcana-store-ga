import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/db"
import { ApiResponse } from "@/lib/types"
import { rateLimitApi, RateLimitPresets } from "@/lib/rate-limit"

// GET: Obtener todos los productos (no cartas)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productType = searchParams.get("productType")
    const status = searchParams.get("status") || "approved"

    if (supabase) {
      try {
        let query = supabase
          .from("products")
          .select("*")
          .eq("status", status)

        if (productType && productType !== "all") {
          query = query.eq("producttype", productType) // La columna en la BD es producttype (minúsculas)
        }

        const { data, error } = await query.order("createdAt", { ascending: false })
        
        console.log(`🔍 GET /api/products - Query result:`, { 
          count: data?.length || 0, 
          productType, 
          error: error?.message 
        })

        if (!error && data) {
          console.log(`✅ GET /api/products - Success: ${data.length} productos encontrados`)
          return NextResponse.json({
            success: true,
            data: data,
            meta: { source: "supabase", count: data.length },
          } as ApiResponse)
        } else {
          console.log(`⚠ GET /api/products - Supabase error: ${error?.message || "unknown"}`, error)
          // Retornar error en lugar de array vacío para debugging
          return NextResponse.json({
            success: false,
            error: error?.message || "Unknown error",
            data: [],
          } as ApiResponse, { status: 500 })
        }
      } catch (err) {
        console.log(`⚠ GET /api/products - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: [],
      meta: { source: "empty" },
    } as ApiResponse)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse,
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo producto
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const product: any = await request.json()
    const productType = product.productType

    // Validar campos requeridos
    if (!product.name || !product.price || !productType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, price, productType",
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Validar que el tipo sea válido
    const validTypes = ["booster", "playmat", "sleeves", "deckbox", "dice", "accessory"]
    if (!validTypes.includes(productType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid productType. Must be one of: ${validTypes.join(", ")}`,
        } as ApiResponse,
        { status: 400 }
      )
    }

    // Intentar crear en Supabase
    let newProduct: any = null
    let dataSource = "supabase"

    if (supabaseAdmin) {
      try {
        // Construir metadata con campos específicos del tipo
        const metadata: any = {}
        
        if (productType === "booster") {
          if (product.set) metadata.set = product.set
          if (product.cardsPerPack) metadata.cardsPerPack = product.cardsPerPack
        } else if (productType === "playmat") {
          if (product.material) metadata.material = product.material
          if (product.size) metadata.size = product.size
        } else if (productType === "sleeves") {
          if (product.count) metadata.count = product.count
          if (product.size) metadata.size = product.size
        } else if (productType === "deckbox") {
          if (product.capacity) metadata.capacity = product.capacity
          if (product.material) metadata.material = product.material
        } else if (productType === "dice") {
          if (product.count) metadata.count = product.count
          if (product.color) metadata.color = product.color
        } else if (productType === "accessory") {
          if (product.category) metadata.category = product.category
        }

        const row: any = {
          id: product.id || `${productType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: product.name,
          image: product.image || null,
          price: Number(product.price),
          stock: Number(product.stock) || 0,
          description: product.description || null,
          producttype: productType, // La columna en la BD es producttype (minúsculas)
          status: product.status || "approved",
          metadata: metadata,
        }

        const { data, error } = await supabaseAdmin
          .from("products")
          .insert(row)
          .select("*")
          .single()

        if (!error && data) {
          newProduct = data
          dataSource = "supabase"
          console.log(`✓ POST /api/products - Created in SUPABASE: ${newProduct.id} (${productType})`)
          
          // Crear log
          await supabaseAdmin.from("logs").insert({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId: "system",
            action: `${productType}_created`,
            entityType: "product",
            entityId: row.id,
            details: { source: "api", productType },
          })
        } else {
          console.log(`⚠ POST /api/products - Supabase error: ${error?.message || "unknown"}`)
          return NextResponse.json(
            {
              success: false,
              error: error?.message || "Failed to create product",
              details: error?.details || null,
            } as ApiResponse,
            { status: 500 }
          )
        }
      } catch (err) {
        console.log(`⚠ POST /api/products - Supabase connection error: ${err instanceof Error ? err.message : "unknown"}`)
        return NextResponse.json(
          {
            success: false,
            error: err instanceof Error ? err.message : "Connection error",
          } as ApiResponse,
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase not configured",
        } as ApiResponse,
        { status: 500 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: newProduct,
      message: "Product created successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// PATCH: Actualizar un producto
export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimitApi(request, RateLimitPresets.admin)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()
    const { productId, ...updates } = body

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        } as ApiResponse,
        { status: 400 }
      )
    }

    if (supabaseAdmin) {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      }

      if (updates.price !== undefined) updateData.price = Number(updates.price)
      if (updates.stock !== undefined) updateData.stock = Number(updates.stock)
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.image !== undefined) updateData.image = updates.image
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata

      const { data, error } = await supabaseAdmin
        .from("products")
        .update(updateData)
        .eq("id", productId)
        .select("*")
        .single()

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data: data,
          message: "Product updated successfully",
        } as ApiResponse)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: error?.message || "Failed to update product",
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

