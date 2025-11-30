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

    const { data, error } = await supabaseAdmin
      .from("price_calculation_settings")
      .select("*")
      .eq("id", "default")
      .single()

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

    return NextResponse.json({
      success: true,
      data: {
        // Usar nullish coalescing (??) en lugar de || para permitir valores 0
        usTaxRate: data.usTaxRate != null ? parseFloat(String(data.usTaxRate)) : 0.08,
        shippingUSD: data.shippingUSD != null ? parseFloat(String(data.shippingUSD)) : 8,
        chileVATRate: data.chileVATRate != null ? parseFloat(String(data.chileVATRate)) : 0.19,
        exchangeRate: data.exchangeRate != null ? parseFloat(String(data.exchangeRate)) : 1000,
        profitMargin: data.profitMargin != null ? parseFloat(String(data.profitMargin)) : 0.20,
        mercadoPagoFee: data.mercadoPagoFee != null ? parseFloat(String(data.mercadoPagoFee)) : 0.034,
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

    // Usar supabaseAdmin que debería bypass RLS, pero si hay problemas con la política,
    // intentar deshabilitar RLS temporalmente o usar una query directa
    let { data, error } = await supabaseAdmin
      .from("price_calculation_settings")
      .upsert(
        {
          id: "default",
          ...updateData,
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single()

    // Si hay error relacionado con RLS o función, la política RLS tiene problemas
    if (error && (error.code === "42703" || error.message?.includes("is_admin") || error.message?.includes("permission denied"))) {
      console.error("❌ Error de RLS detectado:", error.message)
      console.error("❌ Código de error:", error.code)
      
      // Retornar error claro indicando que necesita ejecutar la migración
      return NextResponse.json(
        {
          success: false,
          error: "Error de política RLS. La política está intentando usar is_admin() que no existe.",
          code: error.code,
          message: "Por favor ejecuta la migración SQL para corregir la política RLS:",
          migrationFile: "scripts/migrations/fix-price-calculation-settings-rls.sql",
          details: error.message,
        },
        { status: 500 }
      )
    }

    if (error) {
      // Si la tabla no existe, dar un mensaje más claro
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.error("❌ Tabla price_calculation_settings no existe. Ejecuta la migración primero.")
        throw new Error("La tabla de configuración no existe. Por favor ejecuta la migración: scripts/migrations/create-price-calculation-settings-table.sql")
      }
      console.error("❌ Error en upsert de price_calculation_settings:", error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Parámetros de cálculo actualizados correctamente",
      data: {
        usTaxRate: parseFloat(data.usTaxRate),
        shippingUSD: parseFloat(data.shippingUSD),
        chileVATRate: parseFloat(data.chileVATRate),
        exchangeRate: parseFloat(data.exchangeRate),
        profitMargin: parseFloat(data.profitMargin),
        mercadoPagoFee: parseFloat(data.mercadoPagoFee),
      },
    })
  } catch (error) {
    console.error("Error updating price calculation settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorCode = (error as any)?.code
    
    // Si la tabla no existe, dar un mensaje más claro
    if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error: "La tabla price_calculation_settings no existe. Por favor ejecuta la migración: scripts/migrations/create-price-calculation-settings-table.sql",
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

