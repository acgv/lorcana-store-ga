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
    const customParams = {
      usTaxRate: body.usTaxRate ? parseFloat(body.usTaxRate) : undefined,
      shippingUSD: body.shippingUSD ? parseFloat(body.shippingUSD) : undefined,
      chileVATRate: body.chileVATRate ? parseFloat(body.chileVATRate) : undefined,
      exchangeRate: body.exchangeRate ? parseFloat(body.exchangeRate) : undefined,
      profitMargin: body.profitMargin ? parseFloat(body.profitMargin) : undefined,
      mercadoPagoFee: body.mercadoPagoFee ? parseFloat(body.mercadoPagoFee) : undefined,
    }

    // Buscar precio en TCGPlayer usando set y número (más exacto)
    const cardNameToSearch = cardName || card.name
    const setIdToUse = setId || card.set?.toUpperCase() // Convertir a formato de API (ej: "firstChapter" -> "TFC")
    const cardNumberToUse = cardNumber || card.number

    // Mapear set de BD a Set_ID de API
    // El set en BD viene como "firstChapter", pero necesitamos "TFC" para la API
    const setToIdMap: Record<string, string> = {
      'firstchapter': 'TFC',
      'riseoffloodborn': 'ROF',
      'intoinklands': 'ITI',
      'ursulareturn': 'UR',
      'shimmering': 'SS',
      'azurite': 'AS',
      'archazia': 'AI',
      'reignofjafar': 'ROJ',
      'fabled': 'F',
      'whi': 'WIW',
      'whisper': 'WIW',
    }

    // Si recibimos setId directamente (ya en formato API), usarlo
    // Si recibimos set de BD, mapearlo
    let apiSetId: string | undefined = undefined
    if (setIdToUse) {
      const setIdLower = setIdToUse.toLowerCase()
      if (setToIdMap[setIdLower]) {
        apiSetId = setToIdMap[setIdLower]
      } else if (setIdToUse.length <= 4 && setIdToUse === setIdToUse.toUpperCase()) {
        // Ya está en formato API (ej: "TFC", "ROF")
        apiSetId = setIdToUse
      } else {
        // Intentar usar el valor tal cual
        apiSetId = setIdToUse
      }
    }

    console.log(`🔍 Buscando con: setId=${apiSetId}, cardNumber=${cardNumberToUse}, name=${cardNameToSearch}`)

    let marketPriceUSD: number | null = null
    let marketFoilPriceUSD: number | null = null
    let priceSource: "tcgplayer" | "standard" = "standard"

    try {
      const altPrice = await getTCGPlayerPriceAlternative(cardNameToSearch, {
        setId: apiSetId,
        cardNumber: cardNumberToUse,
        setName: setName,
      })

      if (altPrice && altPrice.normal) {
        marketPriceUSD = altPrice.normal
        marketFoilPriceUSD = altPrice.foil || null
        priceSource = "tcgplayer"
        console.log(`✅ Precio TCGPlayer obtenido: $${marketPriceUSD} USD${marketFoilPriceUSD ? ` (foil: $${marketFoilPriceUSD} USD)` : ''}`)
      } else {
        console.warn(`⚠️ No se pudo obtener precio TCGPlayer para ${cardNameToSearch}`)
      }
    } catch (error) {
      console.error(`❌ Error buscando precio TCGPlayer:`, error)
    }

    // Calcular precio sugerido si tenemos precio de TCGPlayer
    let suggestedPriceCLP: number | null = null
    let suggestedFoilPriceCLP: number | null = null

    if (marketPriceUSD && priceSource === "tcgplayer") {
      const defaultParams = getCalculationParams()
      const calcParams = {
        ...defaultParams,
        ...(customParams.usTaxRate !== undefined && { usTaxRate: customParams.usTaxRate }),
        ...(customParams.shippingUSD !== undefined && { shippingUSD: customParams.shippingUSD }),
        ...(customParams.chileVATRate !== undefined && { chileVATRate: customParams.chileVATRate }),
        ...(customParams.exchangeRate !== undefined && { exchangeRate: customParams.exchangeRate }),
        ...(customParams.profitMargin !== undefined && { profitMargin: customParams.profitMargin }),
        ...(customParams.mercadoPagoFee !== undefined && { mercadoPagoFee: customParams.mercadoPagoFee }),
      }

      const calculation = calculateFinalPrice({
        ...calcParams,
        basePriceUSD: marketPriceUSD,
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
        priceSource,
        suggestedPriceCLP,
        suggestedFoilPriceCLP,
        priceDifference: priceComparison.difference,
        foilPriceDifference: foilComparison.difference,
        priceDifferencePercent: priceComparison.differencePercent,
        foilPriceDifferencePercent: foilComparison.differencePercent,
        needsPriceUpdate: priceComparison.needsUpdate || foilComparison.needsUpdate,
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

