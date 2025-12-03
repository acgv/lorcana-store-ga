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
    // If the function doesn't exist (migration not run), fall back to defaults
    const { data, error } = await supabaseAdmin
      .rpc("get_price_calculation_settings")

    if (error) {
      // Si la función no existe (migración no ejecutada), retornar valores por defecto
      if (
        error.code === "42P01" || // table does not exist
        error.code === "42883" || // function does not exist
        error.code === "PGRST116" || // no rows returned
        error.message?.includes("does not exist") ||
        error.message?.includes("function") && error.message?.includes("does not exist")
      ) {
        console.warn("⚠️ Función get_price_calculation_settings no existe o tabla no existe. Usando valores por defecto. Ejecuta la migración: scripts/migrations/move-price-calculation-settings-to-private-schema.sql")
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
      // Para otros errores, loguear y retornar valores por defecto
      console.error("❌ Error al llamar get_price_calculation_settings:", error)
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

    // RPC returns an array, get first result
    const settings = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data

    // Si no hay datos, retornar valores por defecto
    if (!settings) {
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

    // Map the new column names (result_*) to the expected format
    // Support both new format (result_*) and old format for backward compatibility
    const mappedSettings = settings as any;
    const usTaxRate = mappedSettings.result_usTaxRate ?? mappedSettings.usTaxRate;
    const shippingUSD = mappedSettings.result_shippingUSD ?? mappedSettings.shippingUSD;
    const chileVATRate = mappedSettings.result_chileVATRate ?? mappedSettings.chileVATRate;
    const exchangeRate = mappedSettings.result_exchangeRate ?? mappedSettings.exchangeRate;
    const profitMargin = mappedSettings.result_profitMargin ?? mappedSettings.profitMargin;
    const mercadoPagoFee = mappedSettings.result_mercadoPagoFee ?? mappedSettings.mercadoPagoFee;

    return NextResponse.json({
      success: true,
      data: {
        // Usar nullish coalescing (??) en lugar de || para permitir valores 0
        usTaxRate: usTaxRate != null ? parseFloat(String(usTaxRate)) : 0.08,
        shippingUSD: shippingUSD != null ? parseFloat(String(shippingUSD)) : 8,
        chileVATRate: chileVATRate != null ? parseFloat(String(chileVATRate)) : 0.19,
        exchangeRate: exchangeRate != null ? parseFloat(String(exchangeRate)) : 1000,
        profitMargin: profitMargin != null ? parseFloat(String(profitMargin)) : 0.20,
        mercadoPagoFee: mercadoPagoFee != null ? parseFloat(String(mercadoPagoFee)) : 0.034,
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

    // Build the settings object - include all values that are provided (even if 0)
    // This ensures the SQL function knows which fields to update
    const settingsObj: any = {}
    if (usTaxRate !== undefined) {
      settingsObj.usTaxRate = Number(usTaxRate)
      settingsObj.p_usTaxRate = Number(usTaxRate) // Include both formats for compatibility
    }
    if (shippingUSD !== undefined) {
      settingsObj.shippingUSD = Number(shippingUSD)
      settingsObj.p_shippingUSD = Number(shippingUSD)
    }
    if (chileVATRate !== undefined) {
      settingsObj.chileVATRate = Number(chileVATRate)
      settingsObj.p_chileVATRate = Number(chileVATRate)
    }
    if (exchangeRate !== undefined) {
      settingsObj.exchangeRate = Number(exchangeRate)
      settingsObj.p_exchangeRate = Number(exchangeRate)
    }
    if (profitMargin !== undefined) {
      settingsObj.profitMargin = Number(profitMargin)
      settingsObj.p_profitMargin = Number(profitMargin)
    }
    if (mercadoPagoFee !== undefined) {
      settingsObj.mercadoPagoFee = Number(mercadoPagoFee)
      settingsObj.p_mercadoPagoFee = Number(mercadoPagoFee)
    }

    // Upsert (insert or update)
    // Verificar que la tabla existe, si no, retornar error más descriptivo
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not configured")
    }

    // Use RPC function to access the private admin schema table
    // The table is in admin schema, not exposed to PostgREST, only accessible via service role
    // Using JSON parameter for better PostgREST compatibility
    const rpcParams = {
      p_settings: settingsObj
    }

    console.log("🔧 Calling upsert_price_calculation_settings with params:", JSON.stringify(rpcParams, null, 2))
    console.log("🔧 Settings object keys:", Object.keys(settingsObj))
    console.log("🔧 Settings values:", {
      usTaxRate: settingsObj.usTaxRate,
      shippingUSD: settingsObj.shippingUSD,
      chileVATRate: settingsObj.chileVATRate,
      exchangeRate: settingsObj.exchangeRate,
      profitMargin: settingsObj.profitMargin,
      mercadoPagoFee: settingsObj.mercadoPagoFee,
    })
    
    const { data, error } = await supabaseAdmin
      .rpc("upsert_price_calculation_settings", rpcParams)
    
    console.log("🔧 RPC response:", { data, error: error ? { code: error.code, message: error.message } : null })

    // Ya no hay problemas de RLS porque la tabla está en un schema privado

    if (error) {
      console.error("❌ Error en upsert de price_calculation_settings:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      
      // Si la función no existe (migración no ejecutada) o PostgREST no la encuentra
      if (
        error.code === "42P01" || // table does not exist
        error.code === "42883" || // function does not exist
        error.code === "PGRST202" || // function not found by PostgREST schema cache
        error.message?.includes("does not exist") ||
        error.message?.includes("Could not find the function") ||
        (error.message?.includes("function") && error.message?.includes("does not exist"))
      ) {
        console.error("❌ Función upsert_price_calculation_settings no existe o PostgREST no la encuentra:", {
          code: error.code,
          message: error.message,
        })
        
        let errorMessage = "La función de configuración no es accesible."
        let instructions = []
        
        if (error.code === "PGRST202") {
          instructions.push("1. Ejecuta la migración: scripts/migrations/move-price-calculation-settings-to-private-schema.sql")
          instructions.push("2. Espera 2-3 minutos para que PostgREST refresque su schema cache automáticamente")
          instructions.push("3. O ejecuta: scripts/migrations/verify-and-refresh-price-calculation-functions.sql")
          instructions.push("4. Si persiste, reinicia tu proyecto de Supabase (Settings > Database > Restart)")
        } else {
          instructions.push("Ejecuta la migración: scripts/migrations/move-price-calculation-settings-to-private-schema.sql")
        }
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            code: error.code,
            details: error.message,
            instructions: instructions,
          },
          { status: 500 }
        )
      }
      throw error
    }

    // RPC returns an array, get first result
    const settings = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data

    // Si no hay datos, usar los valores que se intentaron guardar
    if (!settings) {
      return NextResponse.json({
        success: true,
        message: "Parámetros de cálculo actualizados correctamente (valores por defecto aplicados)",
        data: {
          usTaxRate: usTaxRate !== undefined ? Number(usTaxRate) : 0.08,
          shippingUSD: shippingUSD !== undefined ? Number(shippingUSD) : 8,
          chileVATRate: chileVATRate !== undefined ? Number(chileVATRate) : 0.19,
          exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : 1000,
          profitMargin: profitMargin !== undefined ? Number(profitMargin) : 0.20,
          mercadoPagoFee: mercadoPagoFee !== undefined ? Number(mercadoPagoFee) : 0.034,
        },
      })
    }
    
    console.log("🔧 Settings returned from RPC:", JSON.stringify(settings, null, 2))
    console.log("🔧 Settings type:", typeof settings, Array.isArray(settings))
    console.log("🔧 Settings keys:", settings ? Object.keys(settings as any) : 'null')

    // Map the new column names (result_*) to the expected format
    // The RPC function returns an array, get first result
    const settingsObj = Array.isArray(settings) ? (settings.length > 0 ? settings[0] : null) : settings
    
    if (!settingsObj) {
      console.error("❌ No settings returned from RPC")
      return NextResponse.json({
        success: false,
        error: "No se recibieron datos de la función SQL",
      }, { status: 500 })
    }
    
    console.log("🔧 Settings object after processing:", JSON.stringify(settingsObj, null, 2))
    
    // Extract values - handle both result_* format and direct format
    // IMPORTANT: Check for undefined specifically, not just null, to handle 0 correctly
    const getValue = (obj: any, key: string, altKey?: string): number | null => {
      const value = obj?.[key] ?? obj?.[altKey]
      // If value is explicitly undefined, return null; otherwise return the value (even if 0)
      return value === undefined ? null : (value != null ? Number(value) : null)
    }
    
    const result_usTaxRate = getValue(settingsObj, 'result_usTaxRate', 'usTaxRate')
    const result_shippingUSD = getValue(settingsObj, 'result_shippingUSD', 'shippingUSD')
    const result_chileVATRate = getValue(settingsObj, 'result_chileVATRate', 'chileVATRate')
    const result_exchangeRate = getValue(settingsObj, 'result_exchangeRate', 'exchangeRate')
    const result_profitMargin = getValue(settingsObj, 'result_profitMargin', 'profitMargin')
    const result_mercadoPagoFee = getValue(settingsObj, 'result_mercadoPagoFee', 'mercadoPagoFee')
    
    console.log("🔧 Extracted values:", {
      usTaxRate: result_usTaxRate,
      shippingUSD: result_shippingUSD,
      chileVATRate: result_chileVATRate,
      exchangeRate: result_exchangeRate,
      profitMargin: result_profitMargin,
      mercadoPagoFee: result_mercadoPagoFee,
    })
    
    return NextResponse.json({
      success: true,
      message: "Parámetros de cálculo actualizados correctamente",
      data: {
        usTaxRate: result_usTaxRate !== null ? result_usTaxRate : 0.08,
        shippingUSD: result_shippingUSD !== null ? result_shippingUSD : 8,
        chileVATRate: result_chileVATRate !== null ? result_chileVATRate : 0.19,
        exchangeRate: result_exchangeRate !== null ? result_exchangeRate : 1000,
        profitMargin: result_profitMargin !== null ? result_profitMargin : 0.20,
        mercadoPagoFee: result_mercadoPagoFee !== null ? result_mercadoPagoFee : 0.034,
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

