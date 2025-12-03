import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyAdmin } from "@/lib/auth"

// GET: Obtener parámetros de cálculo de precios
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    if (!supabaseAdmin) {
      // Si no hay supabaseAdmin, retornar valores por defecto
      return NextResponse.json({
        success: true,
        data: {
          usTaxRate: 0.08,
          shippingUSD: 8,
          chileVATRate: 0.19,
          exchangeRate: 1000,
          profitMargin: 0.20,
          mercadoPagoFee: 0.034,
        },
      })
    }

    // Use RPC function to access the private admin schema table
    const { data, error } = await supabaseAdmin
      .rpc("get_price_calculation_settings")

    if (error) {
      // Si no existe la tabla, retornar valores por defecto
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("⚠️ Tabla price_calculation_settings no existe, usando valores por defecto")
        return NextResponse.json({
          success: true,
          data: {
            usTaxRate: 0.08,
            shippingUSD: 8,
            chileVATRate: 0.19,
            exchangeRate: 1000,
            profitMargin: 0.20,
            mercadoPagoFee: 0.034,
          },
        })
      }
      // Si no existe el registro, retornar valores por defecto
      if (error.code === "PGRST116") {
        return NextResponse.json({
          success: true,
          data: {
            usTaxRate: 0.08,
            shippingUSD: 8,
            chileVATRate: 0.19,
            exchangeRate: 1000,
            profitMargin: 0.20,
            mercadoPagoFee: 0.034,
          },
        })
      }
      throw error
    }

    // RPC returns an array, get first result
    const settings = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      data: {
        // Usar nullish coalescing (??) en lugar de || para permitir valores 0
        usTaxRate: settings?.usTaxRate != null ? parseFloat(String(settings.usTaxRate)) : 0.08,
        shippingUSD: settings?.shippingUSD != null ? parseFloat(String(settings.shippingUSD)) : 8,
        chileVATRate: settings?.chileVATRate != null ? parseFloat(String(settings.chileVATRate)) : 0.19,
        exchangeRate: settings?.exchangeRate != null ? parseFloat(String(settings.exchangeRate)) : 1000,
        profitMargin: settings?.profitMargin != null ? parseFloat(String(settings.profitMargin)) : 0.20,
        mercadoPagoFee: settings?.mercadoPagoFee != null ? parseFloat(String(settings.mercadoPagoFee)) : 0.034,
      },
    })
  } catch (error) {
    console.error("Error fetching price calculation settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorCode = (error as any)?.code
    
    // Si la tabla no existe, retornar valores por defecto en lugar de error
    if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
      console.warn("⚠️ Tabla price_calculation_settings no existe, retornando valores por defecto")
      return NextResponse.json({
        success: true,
        data: {
          usTaxRate: 0.08,
          shippingUSD: 8,
          chileVATRate: 0.19,
          exchangeRate: 1000,
          profitMargin: 0.20,
          mercadoPagoFee: 0.034,
        },
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    )
  }
}

// POST: Actualizar parámetros de cálculo de precios
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    const body = await request.json()
    const { usTaxRate, shippingUSD, chileVATRate, exchangeRate, profitMargin, mercadoPagoFee } = body

    const updateData: any = {}
    if (usTaxRate !== undefined) updateData.usTaxRate = Number(usTaxRate)
    if (shippingUSD !== undefined) updateData.shippingUSD = Number(shippingUSD)
    if (chileVATRate !== undefined) updateData.chileVATRate = Number(chileVATRate)
    if (exchangeRate !== undefined) updateData.exchangeRate = Number(exchangeRate)
    if (profitMargin !== undefined) updateData.profitMargin = Number(profitMargin)
    if (mercadoPagoFee !== undefined) updateData.mercadoPagoFee = Number(mercadoPagoFee)

    // Upsert (insert or update)
    // Verificar que la tabla existe, si no, retornar error más descriptivo
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not configured")
    }

    // Use RPC function to access the private admin schema table
    // The table is in admin schema, not exposed to PostgREST, only accessible via service role
    const { data, error } = await supabaseAdmin
      .rpc("upsert_price_calculation_settings", {
        p_usTaxRate: updateData.usTaxRate ?? null,
        p_shippingUSD: updateData.shippingUSD ?? null,
        p_chileVATRate: updateData.chileVATRate ?? null,
        p_exchangeRate: updateData.exchangeRate ?? null,
        p_profitMargin: updateData.profitMargin ?? null,
        p_mercadoPagoFee: updateData.mercadoPagoFee ?? null,
      })

    // Ya no hay problemas de RLS porque la tabla está en un schema privado

    if (error) {
      // Si la tabla no existe, dar un mensaje más claro
      if (error.code === "42P01" || error.code === "42883" || error.message?.includes("does not exist") || error.message?.includes("function") && error.message?.includes("does not exist")) {
        console.error("❌ Función o tabla no existe. Ejecuta la migración primero.")
        throw new Error("La función o tabla de configuración no existe. Por favor ejecuta la migración: scripts/migrations/move-price-calculation-settings-to-private-schema.sql")
      }
      console.error("❌ Error en upsert de price_calculation_settings:", error)
      throw error
    }

    // RPC returns an array, get first result
    const settings = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      message: "Parámetros de cálculo actualizados correctamente",
      data: {
        usTaxRate: parseFloat(settings?.usTaxRate || "0.08"),
        shippingUSD: parseFloat(settings?.shippingUSD || "8"),
        chileVATRate: parseFloat(settings?.chileVATRate || "0.19"),
        exchangeRate: parseFloat(settings?.exchangeRate || "1000"),
        profitMargin: parseFloat(settings?.profitMargin || "0.20"),
        mercadoPagoFee: parseFloat(settings?.mercadoPagoFee || "0.034"),
      },
    })
  } catch (error) {
    console.error("Error updating price calculation settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorCode = (error as any)?.code
    
    // Si la tabla no existe, dar un mensaje más claro
      if (errorCode === "42P01" || errorCode === "42883" || errorMessage.includes("does not exist") || (errorMessage.includes("function") && errorMessage.includes("does not exist"))) {
        return NextResponse.json(
          {
            success: false,
            error: "La función o tabla de configuración no existe. Por favor ejecuta la migración: scripts/migrations/move-price-calculation-settings-to-private-schema.sql",
            code: errorCode,
          },
          { status: 500 }
        )
      }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    )
  }
}

