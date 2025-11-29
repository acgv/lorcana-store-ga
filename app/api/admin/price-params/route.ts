import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// Verificar que el usuario es admin
async function verifyAdmin(request: NextRequest): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const cookies = request.cookies
      const sessionToken = cookies.get("sb-access-token")?.value || 
                          cookies.get("supabase-auth-token")?.value
      
      if (!sessionToken) {
        return { success: false, error: "No authentication token", status: 401 }
      }

      if (!supabaseAdmin) {
        return { success: false, error: "Auth service not configured", status: 503 }
      }

      const { data, error } = await supabaseAdmin.auth.getUser(sessionToken)
      if (error || !data.user) {
        return { success: false, error: "Invalid token", status: 401 }
      }

      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single()

      if (!roleData || roleData.role !== "admin") {
        return { success: false, error: "Admin role required", status: 403 }
      }

      return { success: true }
    }

    const token = authHeader.replace("Bearer ", "")
    
    if (!supabaseAdmin) {
      return { success: false, error: "Auth service not configured", status: 503 }
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return { success: false, error: "Invalid token", status: 401 }
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single()

    if (!roleData || roleData.role !== "admin") {
      return { success: false, error: "Admin role required", status: 403 }
    }

    return { success: true }
  } catch (error) {
    console.error("Error verifying admin:", error)
    return { success: false, error: "Internal error", status: 500 }
  }
}

// Parámetros de cálculo de precios
export interface PriceParams {
  usTaxRate: number // Tax en EEUU (ej: 0.08 = 8%)
  shippingUSD: number // Envío en USD
  chileVATRate: number // IVA Chile (0.19 = 19%)
  exchangeRate: number // Tipo de cambio USD→CLP
  profitMargin: number // Ganancia deseada (0.20 = 20%)
  mercadoPagoFee: number // Comisión MercadoPago (0.034 = 3.4%)
}

// Valores por defecto
const DEFAULT_PARAMS: PriceParams = {
  usTaxRate: 0.08,
  shippingUSD: 8,
  chileVATRate: 0.19,
  exchangeRate: 1000,
  profitMargin: 0.20,
  mercadoPagoFee: 0.034,
}

// GET: Obtener parámetros actuales
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Por ahora usar localStorage del cliente, pero podríamos guardar en BD
    // Por simplicidad, devolvemos los defaults y el cliente puede guardar en localStorage
    return NextResponse.json({
      success: true,
      data: DEFAULT_PARAMS,
    })
  } catch (error) {
    console.error("Error getting price params:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST: Guardar parámetros (por ahora solo valida, el cliente guarda en localStorage)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const params: PriceParams = await request.json()

    // Validar parámetros
    if (
      typeof params.usTaxRate !== "number" ||
      typeof params.shippingUSD !== "number" ||
      typeof params.chileVATRate !== "number" ||
      typeof params.exchangeRate !== "number" ||
      typeof params.profitMargin !== "number" ||
      typeof params.mercadoPagoFee !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 }
      )
    }

    // Validar rangos razonables
    if (
      params.usTaxRate < 0 ||
      params.usTaxRate > 1 ||
      params.shippingUSD < 0 ||
      params.chileVATRate < 0 ||
      params.chileVATRate > 1 ||
      params.exchangeRate < 1 ||
      params.profitMargin < 0 ||
      params.profitMargin > 1 ||
      params.mercadoPagoFee < 0 ||
      params.mercadoPagoFee > 1
    ) {
      return NextResponse.json(
        { success: false, error: "Parameters out of valid range" },
        { status: 400 }
      )
    }

    // Por ahora solo validamos, el cliente guarda en localStorage
    // En el futuro podríamos guardar en BD
    return NextResponse.json({
      success: true,
      message: "Parameters validated successfully",
    })
  } catch (error) {
    console.error("Error saving price params:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

