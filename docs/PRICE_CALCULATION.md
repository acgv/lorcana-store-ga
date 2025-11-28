# 💰 Cálculo de Precios Sugeridos

Este documento explica cómo se calculan los precios sugeridos en la comparativa de precios.

## 📊 Fuente de Precios

Actualmente, la API de Lorcana (`api.lorcana-api.com`) **no proporciona precios de mercado**. Solo incluye:
- Información de las cartas (nombre, rareza, tipo, etc.)
- Costo de ink (`Cost`) - que es el costo para jugar la carta, no el precio de venta

**TCGPlayer API**: Según su [documentación oficial](https://docs.tcgplayer.com/docs/getting-started), ya no otorgan nuevas API keys. Solo usuarios existentes pueden usarla.

Por lo tanto, el sistema usa **precios estándar basados en rareza** como referencia de mercado (con soporte opcional para TCGPlayer si ya tienes keys):

| Rareza | Precio Estándar (USD) |
|--------|----------------------|
| Common | $0.50 |
| Uncommon | $1.00 |
| Rare | $2.50 |
| Super Rare | $5.00 |
| Legendary | $30.00 |
| Enchanted | $50.00 |

**Nota**: Estos son precios de referencia. Si tienes acceso a precios reales de mercado (por ejemplo, de TCGPlayer u otra fuente), puedes actualizar la función `getStandardPriceUSD()` en `app/api/admin/compare-prices/route.ts`.

## 🧮 Fórmula de Cálculo

El precio sugerido se calcula usando la fórmula del Excel:

### Variables:
- **P**: Precio base en USD (de la API o estándar por rareza)
- **T**: Tax en EEUU (19% por defecto)
- **E**: Envío en USD ($8 por defecto)
- **IVA**: IVA Chile (19% por defecto)
- **D**: Tipo de cambio USD→CLP (1000 por defecto)
- **G**: Ganancia deseada (20% por defecto)
- **MP**: Comisión MercadoPago (4% por defecto)

### Pasos del Cálculo:

1. **Costo en USD sin IVA** = P + (P × T) + E
2. **Costo tras IVA en USD** = Costo sin IVA × (1 + IVA)
3. **Costo total en CLP** = Costo con IVA × D
4. **Costo con ganancia** = Costo total × (1 + G)
5. **Precio final** = Costo con ganancia / (1 - MP)

### Ejemplo:

Si una carta tiene precio estándar de $2.50 USD (Rare):

1. Costo sin IVA: $2.50 + ($2.50 × 0.19) + $8 = $10.98 USD
2. Costo con IVA: $10.98 × 1.19 = $13.07 USD
3. Costo en CLP: $13.07 × 1000 = 13,070 CLP
4. Con ganancia: 13,070 × 1.20 = 15,684 CLP
5. Precio final: 15,684 / 0.96 = **16,338 CLP**

## ⚙️ Configuración

Puedes ajustar los parámetros con variables de entorno:

```env
US_TAX_RATE=0.19          # Tax en EEUU (19%)
SHIPPING_USD=8           # Envío en USD
CHILE_VAT_RATE=0.19      # IVA Chile (19%)
EXCHANGE_RATE=1000        # Tipo de cambio USD→CLP
PROFIT_MARGIN=0.2        # Ganancia deseada (20%)
MERCADOPAGO_FEE=0.04     # Comisión MercadoPago (4%)
```

Si no se configuran, se usan los valores por defecto del Excel.

## 🔄 Futuras Mejoras

Si en el futuro:
- La API de Lorcana agrega precios de mercado
- Tienes acceso a otra API de precios (TCGPlayer, etc.)
- Quieres usar precios de otra fuente

Puedes actualizar la función en `app/api/admin/compare-prices/route.ts` para obtener precios reales en lugar de usar los estándar por rareza.

## 📝 Notas

- Los precios estándar son estimaciones basadas en valores típicos de mercado
- El cálculo considera todos los costos (tax, envío, IVA, ganancia, comisiones)
- El precio sugerido es el precio final que deberías cobrar para cubrir todos los costos y obtener la ganancia deseada
- La comparativa muestra si tu precio actual difiere más del 5% del precio sugerido

