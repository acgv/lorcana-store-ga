/**
 * Calculadora de Precios
 * 
 * Calcula el precio final de venta basado en el precio de TCGPlayer
 * usando la fórmula del Excel de costos
 * 
 * Variables:
 * - P: Precio base en USD (de TCGPlayer)
 * - T: Tax en EEUU (ej: 0.19 = 19%)
 * - E: Envío en USD
 * - IVA: IVA Chile (0.19 = 19%)
 * - D: Tipo de cambio USD→CLP (1000)
 * - G: Ganancia deseada (0.2 = 20%)
 * - MP: Comisión MercadoPago (0.04 = 4%)
 */

export interface PriceCalculationParams {
  basePriceUSD: number // P: Precio base en USD (de TCGPlayer)
  usTaxRate?: number // T: Tax en EEUU (default: 0.19 = 19%)
  shippingUSD?: number // E: Envío en USD (default: 8)
  chileVATRate?: number // IVA: IVA Chile (default: 0.19 = 19%)
  exchangeRate?: number // D: Tipo de cambio USD→CLP (default: 1000)
  profitMargin?: number // G: Ganancia deseada (default: 0.2 = 20%)
  mercadoPagoFee?: number // MP: Comisión MercadoPago (default: 0.04 = 4%)
}

export interface PriceCalculationResult {
  // Costos intermedios
  costUSDWithoutVAT: number // Costo en USD sin IVA
  costUSDWithVAT: number // Costo tras IVA en USD
  totalCostCLP: number // Costo total en CLP
  costWithProfitCLP: number // Costo con ganancia
  finalPriceCLP: number // Precio final a cobrar
  
  // Desglose
  basePriceCLP: number
  shippingCLP: number
  usTaxCLP: number
  chileVATCLP: number
  profitCLP: number
  mercadoPagoFeeCLP: number
}

/**
 * Calcular precio final de venta basado en precio de TCGPlayer
 * 
 * Fórmula del Excel:
 * 1. Costo en USD sin IVA = P + (P * T) + E
 * 2. Costo tras IVA en USD = Costo sin IVA * (1 + IVA)
 * 3. Costo total en CLP = Costo con IVA * D
 * 4. Costo con ganancia = Costo total * (1 + G)
 * 5. Precio final = Costo con ganancia / (1 - MP)
 */
export function calculateFinalPrice(
  params: PriceCalculationParams
): PriceCalculationResult {
  const {
    basePriceUSD,
    usTaxRate = 0.19, // 19% tax en EEUU
    shippingUSD = 8, // $8 USD envío
    chileVATRate = 0.19, // 19% IVA Chile
    exchangeRate = 1000, // 1 USD = 1000 CLP
    profitMargin = 0.2, // 20% ganancia
    mercadoPagoFee = 0.04, // 4% comisión MercadoPago
  } = params

  // 1. Costo en USD sin IVA = P + (P * T) + E
  const costUSDWithoutVAT = basePriceUSD + (basePriceUSD * usTaxRate) + shippingUSD

  // 2. Costo tras IVA en USD = Costo sin IVA * (1 + IVA)
  const costUSDWithVAT = costUSDWithoutVAT * (1 + chileVATRate)

  // 3. Costo total en CLP = Costo con IVA * D
  const totalCostCLP = costUSDWithVAT * exchangeRate

  // 4. Costo con ganancia = Costo total * (1 + G)
  const costWithProfitCLP = totalCostCLP * (1 + profitMargin)

  // 5. Precio final = Costo con ganancia / (1 - MP)
  // Esto asegura que después de la comisión de MP, obtengas el costo con ganancia
  const finalPriceCLP = costWithProfitCLP / (1 - mercadoPagoFee)

  // Desglose para información
  const basePriceCLP = basePriceUSD * exchangeRate
  const shippingCLP = shippingUSD * exchangeRate
  const usTaxCLP = (basePriceUSD * usTaxRate) * exchangeRate
  const chileVATCLP = (costUSDWithoutVAT * chileVATRate) * exchangeRate
  const profitCLP = totalCostCLP * profitMargin
  const mercadoPagoFeeCLP = finalPriceCLP * mercadoPagoFee

  return {
    costUSDWithoutVAT,
    costUSDWithVAT,
    totalCostCLP: Math.round(totalCostCLP),
    costWithProfitCLP: Math.round(costWithProfitCLP),
    finalPriceCLP: Math.round(finalPriceCLP),
    basePriceCLP: Math.round(basePriceCLP),
    shippingCLP: Math.round(shippingCLP),
    usTaxCLP: Math.round(usTaxCLP),
    chileVATCLP: Math.round(chileVATCLP),
    profitCLP: Math.round(profitCLP),
    mercadoPagoFeeCLP: Math.round(mercadoPagoFeeCLP),
  }
}

/**
 * Obtener parámetros de cálculo desde variables de entorno o defaults
 */
export function getCalculationParams(): Omit<PriceCalculationParams, "basePriceUSD"> {
  return {
    usTaxRate: parseFloat(process.env.US_TAX_RATE || "0.19"),
    shippingUSD: parseFloat(process.env.SHIPPING_USD || "8"),
    chileVATRate: parseFloat(process.env.CHILE_VAT_RATE || "0.19"),
    exchangeRate: parseFloat(process.env.EXCHANGE_RATE || "1000"),
    profitMargin: parseFloat(process.env.PROFIT_MARGIN || "0.2"),
    mercadoPagoFee: parseFloat(process.env.MERCADOPAGO_FEE || "0.04"),
  }
}

/**
 * Calcular diferencia porcentual entre precio actual y precio sugerido
 */
export function calculatePriceDifference(
  currentPrice: number,
  suggestedPrice: number
): {
  difference: number
  differencePercent: number
  needsUpdate: boolean
} {
  const difference = currentPrice - suggestedPrice
  const differencePercent = suggestedPrice > 0 ? (difference / suggestedPrice) * 100 : 0
  const needsUpdate = Math.abs(differencePercent) > 5 // Más de 5% de diferencia

  return {
    difference: Math.round(difference),
    differencePercent: Math.round(differencePercent * 100) / 100,
    needsUpdate,
  }
}

