import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyAdmin } from "@/lib/auth"
import { getTCGPlayerPriceAlternative } from "@/lib/tcgplayer-alternative"
import { calculateFinalPrice, getCalculationParams, calculatePriceDifference } from "@/lib/price-calculator"

// POST: Buscar precio de TCGPlayer para una carta específica
export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    const body = await request.json()
    const { cardId, setId, cardNumber, cardName, setName } = body

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: "Card ID is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 Buscando precio TCGPlayer para carta: ${cardId} (${cardName || 'sin nombre'})`)
    console.log(`📥 Parámetros recibidos en el body:`, {
      usTaxRate: body.usTaxRate,
      shippingUSD: body.shippingUSD,
      chileVATRate: body.chileVATRate,
      exchangeRate: body.exchangeRate,
      profitMargin: body.profitMargin,
      mercadoPagoFee: body.mercadoPagoFee,
    })

    // Obtener la carta de la BD para tener todos los datos
    const { data: card, error: cardError } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: "Card not found" },
        { status: 404 }
      )
    }

    // Obtener parámetros de cálculo de precios (opcionales)
    // IMPORTANTE: Si el valor es 0, también debe ser considerado (no usar || undefined)
    const customParams = {
      usTaxRate: body.usTaxRate !== undefined && body.usTaxRate !== null ? parseFloat(String(body.usTaxRate)) : undefined,
      shippingUSD: body.shippingUSD !== undefined && body.shippingUSD !== null ? parseFloat(String(body.shippingUSD)) : undefined,
      chileVATRate: body.chileVATRate !== undefined && body.chileVATRate !== null ? parseFloat(String(body.chileVATRate)) : undefined,
      exchangeRate: body.exchangeRate !== undefined && body.exchangeRate !== null ? parseFloat(String(body.exchangeRate)) : undefined,
      profitMargin: body.profitMargin !== undefined && body.profitMargin !== null ? parseFloat(String(body.profitMargin)) : undefined,
      mercadoPagoFee: body.mercadoPagoFee !== undefined && body.mercadoPagoFee !== null ? parseFloat(String(body.mercadoPagoFee)) : undefined,
    }
    
    console.log(`📊 Parámetros parseados:`, customParams)

    const cardNameToSearch = cardName || card.name
    const setIdFromDB = setId || card.set
    const cardNumberToUse = cardNumber || card.number

    // El set en BD ya viene como Set_ID nativo (ej: "tfc", "rof", "win")
    // La API externa lo espera en uppercase
    const apiSetId = setIdFromDB ? setIdFromDB.toUpperCase() : undefined

    console.log(`🔍 Buscando precio TCGPlayer con:`, {
      apiSetId,
      cardNumber: cardNumberToUse,
      cardName: cardNameToSearch,
      setIdFromDB,
    })

    let marketPriceUSD: number | null = null
    let marketFoilPriceUSD: number | null = null
    let priceSource: "tcgplayer" | "lorcana-api" | string | null = null
    let priceSourceDetails: string | null = null

    // PRIORIDAD 1: Intentar obtener precio de TCGPlayer
    try {
      console.log(`🔄 Llamando a getTCGPlayerPriceAlternative con:`, {
        cardName: cardNameToSearch,
        options: {
          setId: apiSetId,
          cardNumber: cardNumberToUse,
          setName: setName,
        },
      })

      // Intentar buscar precio, permitiendo bypass de cache si es necesario
      // El bypass se puede activar agregando ?bypassCache=true en la URL o en el body
      const bypassCache = body.bypassCache === true || body.bypassCache === "true"
      
      const altPrice = await getTCGPlayerPriceAlternative(cardNameToSearch, {
        setId: apiSetId,
        cardNumber: cardNumberToUse,
        setName: setName,
        bypassCache: bypassCache,
      })

      console.log(`📊 Resultado de getTCGPlayerPriceAlternative:`, altPrice)

      if (altPrice && altPrice.normal) {
        marketPriceUSD = altPrice.normal
        marketFoilPriceUSD = altPrice.foil || null
        // Usar el source específico de la función para saber exactamente de dónde vino
        priceSource = altPrice.source || "tcgplayer"
        priceSourceDetails = altPrice.source || "unknown"
        console.log(`✅ Precio obtenido de ${altPrice.source}: $${marketPriceUSD} USD${marketFoilPriceUSD ? ` (foil: $${marketFoilPriceUSD} USD)` : ''}`)
        console.log(`📊 Fuente detallada: ${altPrice.source}`)
      }
    } catch (error) {
      console.error(`❌ Error buscando precio TCGPlayer:`, error)
      console.error(`❌ Stack trace:`, error instanceof Error ? error.stack : 'No stack available')
    }

    // PRIORIDAD 2: Si no hay precio de TCGPlayer, NO usar precios estándar
    // El usuario requiere precios reales de mercado, no precios estándar
    if (!marketPriceUSD) {
      console.warn(`⚠️ No se encontró precio real de mercado para ${cardNameToSearch}`)
      console.warn(`⚠️ No se usará precio estándar - se requiere precio real de TCGPlayer/eBay/etc.`)
      // Dejamos marketPriceUSD como null - no usamos precios estándar
    }

    // Calcular precio sugerido si tenemos precio (de TCGPlayer o de API de Lorcana)
    let suggestedPriceCLP: number | null = null
    let suggestedFoilPriceCLP: number | null = null

    if (marketPriceUSD && marketPriceUSD > 0) {
      const defaultParams = getCalculationParams()
      const calcParams = {
        ...defaultParams,
        // Usar valores personalizados si están definidos (incluyendo 0)
        usTaxRate: customParams.usTaxRate !== undefined ? customParams.usTaxRate : defaultParams.usTaxRate,
        shippingUSD: customParams.shippingUSD !== undefined ? customParams.shippingUSD : defaultParams.shippingUSD,
        chileVATRate: customParams.chileVATRate !== undefined ? customParams.chileVATRate : defaultParams.chileVATRate,
        exchangeRate: customParams.exchangeRate !== undefined ? customParams.exchangeRate : defaultParams.exchangeRate,
        profitMargin: customParams.profitMargin !== undefined ? customParams.profitMargin : defaultParams.profitMargin,
        mercadoPagoFee: customParams.mercadoPagoFee !== undefined ? customParams.mercadoPagoFee : defaultParams.mercadoPagoFee,
      }

      console.log(`📊 Parámetros de cálculo para ${cardNameToSearch}:`, {
        basePriceUSD: marketPriceUSD,
        usTaxRate: calcParams.usTaxRate,
        shippingUSD: calcParams.shippingUSD,
        chileVATRate: calcParams.chileVATRate,
        exchangeRate: calcParams.exchangeRate,
        profitMargin: calcParams.profitMargin,
        mercadoPagoFee: calcParams.mercadoPagoFee,
      })

      const calculation = calculateFinalPrice({
        ...calcParams,
        basePriceUSD: marketPriceUSD,
      })
      
      console.log(`📊 Desglose de cálculo para ${cardNameToSearch}:`, {
        costUSDWithoutVAT: calculation.costUSDWithoutVAT,
        costUSDWithVAT: calculation.costUSDWithVAT,
        totalCostCLP: calculation.totalCostCLP,
        costWithProfitCLP: calculation.costWithProfitCLP,
        finalPriceCLP: calculation.finalPriceCLP,
        basePriceCLP: calculation.basePriceCLP,
        shippingCLP: calculation.shippingCLP,
        usTaxCLP: calculation.usTaxCLP,
        chileVATCLP: calculation.chileVATCLP,
        profitCLP: calculation.profitCLP,
        mercadoPagoFeeCLP: calculation.mercadoPagoFeeCLP,
      })
      
      suggestedPriceCLP = calculation.finalPriceCLP

      if (marketFoilPriceUSD) {
        const foilCalculation = calculateFinalPrice({
          ...calcParams,
          basePriceUSD: marketFoilPriceUSD,
        })
        suggestedFoilPriceCLP = foilCalculation.finalPriceCLP
      }
    }

    // Comparar con precio actual
    const priceComparison = suggestedPriceCLP
      ? calculatePriceDifference(card.price || 0, suggestedPriceCLP)
      : { difference: 0, differencePercent: 0, needsUpdate: false }

    const foilComparison = suggestedFoilPriceCLP
      ? calculatePriceDifference(card.foilPrice || 0, suggestedFoilPriceCLP)
      : { difference: 0, differencePercent: 0, needsUpdate: false }

    return NextResponse.json({
      success: true,
      data: {
        cardId: card.id,
        cardName: card.name,
        marketPriceUSD,
        marketFoilPriceUSD,
        priceSource: priceSource || null, // null si no se encontró precio
        suggestedPriceCLP,
        suggestedFoilPriceCLP,
        priceDifference: priceComparison.difference,
        foilPriceDifference: foilComparison.difference,
        priceDifferencePercent: priceComparison.differencePercent,
        foilPriceDifferencePercent: foilComparison.differencePercent,
        needsPriceUpdate: priceComparison.needsUpdate || foilComparison.needsUpdate,
        // Información de debug
        debug: {
          searchedWith: {
            setId: apiSetId,
            cardNumber: cardNumberToUse,
            cardName: cardNameToSearch,
          },
          foundPrice: marketPriceUSD !== null,
          priceSource: priceSource || null,
          priceSourceDetails: priceSourceDetails || null,
          priceDetails: marketPriceUSD ? {
            normal: marketPriceUSD,
            foil: marketFoilPriceUSD,
            source: priceSource,
            sourceDetails: priceSourceDetails,
          } : null,
        },
      },
    })
  } catch (error) {
    console.error("Error in fetch-card-price:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

